import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {defineConfig} from 'vitest/config';
import Vue from 'unplugin-vue/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: {
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      vue: 'vue/dist/vue.esm-bundler.js',
    },
    extensions: ['.ts', '.vue', '.js', '.json'],
  },
  plugins: [
    Vue({
      isProduction: false,
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
  ],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/client/components/setup.ts'],
    include: ['tests/client/**/*.spec.ts'],
    pool: 'forks',
    maxWorkers: 1,
    isolate: false,
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
