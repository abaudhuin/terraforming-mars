import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

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

function assetIndexPlugin() {
  return {
    name: 'terraforming-mars:asset-index',
    async generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((item) => item.type === 'chunk');
      const main = chunks.find((chunk) => chunk.name === 'main');
      const vendors = chunks.find((chunk) => chunk.name === 'vendors');
      if (main === undefined || vendors === undefined) {
        throw new Error('Expected main and vendors in the client bundle');
      }

      const styles = await readFile(path.resolve(__dirname, 'build/styles.css')).catch(() => Buffer.from('development'));
      const assetVersion = createHash('sha256')
        .update(styles)
        .update(main.code)
        .update(vendors.code)
        .digest('hex')
        .slice(0, 16);
      const template = await readFile(path.resolve(__dirname, 'assets/index.html'), 'utf8');
      const placeholders = ['__TM_ASSET_VERSION__', '__TM_MAIN_FILE__', '__TM_VENDORS_FILE__'];
      if (placeholders.some((placeholder) => !template.includes(placeholder))) {
        throw new Error('assets/index.html is missing an asset placeholder');
      }

      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: template
          .replaceAll('__TM_ASSET_VERSION__', assetVersion)
          .replaceAll('__TM_MAIN_FILE__', main.fileName)
          .replaceAll('__TM_VENDORS_FILE__', vendors.fileName),
      });
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
      assetIndexPlugin(),
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
          entryFileNames: (chunk) => chunk.name === 'sw' ? 'sw.js' : 'chunks/[name]-[hash].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
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
