import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import fs from 'fs';

function copyPreloadPlugin(): Plugin {
  const copyPreload = () => {
    const src = path.resolve(__dirname, 'src/preload/index.cjs');
    const destDir = path.resolve(__dirname, 'dist-electron/preload');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, path.join(destDir, 'index.cjs'));
    const oldJs = path.join(destDir, 'index.js');
    if (fs.existsSync(oldJs)) {
      try {
        fs.unlinkSync(oldJs);
      } catch {}
    }
  };

  return {
    name: 'copy-preload-cjs',
    buildStart() {
      copyPreload();
    },
    handleHotUpdate(ctx) {
      if (ctx.file.includes('preload')) {
        copyPreload();
      }
    },
  };
}

export default defineConfig({
  plugins: [
    copyPreloadPlugin(),
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
  },
});
