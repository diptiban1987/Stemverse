import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'STEMVerseScratch',
      formats: ['iife'],
      fileName: 'scratch-engine',
    },
    outDir: resolve(__dirname, '../../apps/web/public/scratch'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  assetsInclude: ['**/*.mp3', '**/*.wav', '**/*.svg', '**/*.png'],
});
