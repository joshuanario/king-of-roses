import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    devtools(), 
    solidPlugin(),
    viteSingleFile(),
  ],
  server: {
    port: 3000,
    proxy: {
      '/folders': 'http://localhost:8080',
    }
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: (filePath) => {
      if (/\.(woff2?|ttf|eot|otf|ico)$/.test(filePath)) {
        return true;
      }
    }
  },
});
