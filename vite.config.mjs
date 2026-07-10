import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {defineConfig} from 'vite';
import Vue from 'unplugin-vue/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function vueStyleInjectPlugin() {
  return {
    name: 'terraforming-mars:vue-style-inject',
    enforce: 'post',
    transform(code, id) {
      if (!id.includes('?vue&type=style')) {
        return null;
      }

      const styleId = Buffer.from(id).toString('base64url');
      return {
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

export default defineConfig(({mode}) => {
  const isProduction = mode === 'production';
  const sourceMap = process.env.TM_BUILD_SOURCEMAPS === '1' || !isProduction;
  const nodeEnv = isProduction ? 'production' : 'development';

  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(nodeEnv),
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
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
        sourceMap,
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
    ],
    css: {
      preprocessorOptions: {
        less: {
          paths: [path.resolve(__dirname, 'src/styles')],
          additionalData: '@import "variables.less"; @import "mixins.less";',
        },
      },
    },
    build: {
      outDir: './build',
      emptyOutDir: false,
      sourcemap: sourceMap,
      target: 'es2021',
      minify: isProduction,
      chunkSizeWarningLimit: 750,
      rolldownOptions: {
        checks: {
          pluginTimings: false,
        },
        input: {
          main: path.resolve(__dirname, 'src/client/main.ts'),
          sw: path.resolve(__dirname, 'src/client/sw.ts'),
        },
        output: {
          format: 'esm',
          entryFileNames: (chunk) => `${chunk.name}.js`,
          chunkFileNames: (chunk) => {
            if (chunk.name === 'vendors') {
              return 'vendors.js';
            }
            if (chunk.name.endsWith('-runtime')) {
              return 'chunks/vite-runtime.js';
            }
            return 'chunks/[name].js';
          },
          assetFileNames: 'assets/[name][extname]',
          manualChunks(id) {
            if (id.includes('/node_modules/')) {
              return 'vendors';
            }
            return undefined;
          },
        },
      },
    },
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'server',
            environment: 'node',
            globals: true,
            setupFiles: ['./tests/testing/setup.ts'],
            include: ['tests/**/*.spec.ts'],
            exclude: ['tests/client/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
            pool: 'forks',
            fileParallelism: false,
            isolate: false,
            testTimeout: 10000,
            hookTimeout: 10000,
          },
        },
        {
          extends: true,
          test: {
            name: 'client',
            environment: 'node',
            globals: true,
            setupFiles: ['./tests/client/components/setup.ts'],
            include: ['tests/client/**/*.spec.ts'],
            pool: 'forks',
            fileParallelism: false,
            isolate: false,
            testTimeout: 10000,
            hookTimeout: 10000,
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            environment: 'node',
            globals: true,
            include: ['tests/integration/**/*.spec.ts'],
            pool: 'forks',
            fileParallelism: false,
            isolate: false,
            testTimeout: 0,
            hookTimeout: 0,
          },
        },
      ],
    },
  };
});
