import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // packages/shared builds to CommonJS (for the NestJS backend); Vite doesn't pre-bundle
    // workspace-linked packages by default, so without this it tries to load the raw CJS file
    // as an ES module and fails. Forcing it through esbuild's pre-bundling gives proper interop.
    include: ['@workflow-brasal/shared'],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
