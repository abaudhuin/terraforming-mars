import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {defineConfig} from 'rolldown';
import {replacePlugin} from 'rolldown/plugins';
import Vue from 'unplugin-vue/rolldown';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

function vueStyleInjectPlugin() {
  return {
    name: 'terraforming-mars:vue-style-inject',
    transform(code, id) {
      if (!id.includes('?vue&type=style')) {
        return null;
      }

      const styleId = Buffer.from(id).toString('base64url');
      return {
        moduleType: 'js',
        code: `
const css = ${JSON.stringify(code)};
const styleId = ${JSON.stringify(styleId)};
if (typeof document !== 'undefined') {
  const attr = 'data-tm-vue-style';
  let style = document.querySelector('style[' + attr + '="' + styleId + '"]');
  if (style === null) {
    style = document.createElement('style');
    style.setAttribute(attr, styleId);
    document.head.appendChild(style);
  }
  if (style.textContent !== css) {
    style.textContent = css;
  }
}
export default css;
`,
        map: {version: 3, sources: [], names: [], mappings: ''},
      };
    },
  };
}

export default defineConfig({
  input: {
    main: './src/client/main.ts',
    sw: './src/client/sw.ts',
  },
  platform: 'browser',
  tsconfig: './tsconfig.json',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      vue: 'vue/dist/vue.esm-bundler.js',
      '@vue/test-utils': path.resolve(__dirname, 'node_modules/@vue/test-utils/dist/vue-test-utils.cjs.js'),
    },
    extensions: ['.ts', '.vue', '.js', '.json'],
  },
  plugins: [
    Vue({
      isProduction,
      sourceMap: true,
      features: {
        optionsAPI: true,
        prodDevtools: false,
        prodHydrationMismatchDetails: false,
      },
      template: {
        transformAssetUrls: false,
      },
      style: {
        preprocessLang: 'less',
        preprocessOptions: {
          paths: [path.resolve(__dirname, 'src/styles')],
          additionalData: '@import "variables.less"; @import "mixins.less";',
        },
      },
    }),
    vueStyleInjectPlugin(),
    replacePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    }),
  ],
  output: {
    dir: './build',
    format: 'esm',
    sourcemap: true,
    entryFileNames: (chunk) => `${chunk.name}.js`,
    chunkFileNames: (chunk) => chunk.name === 'vendors' ? 'vendors.js' : 'chunks/[name].js',
    assetFileNames: 'assets/[name][extname]',
    minify: isProduction,
    manualChunks(id) {
      if (id.includes('/node_modules/')) {
        return 'vendors';
      }
      return undefined;
    },
  },
});
