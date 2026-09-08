import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
export default defineConfig({
  resolve: { tsconfigPaths: true },
  ssr: { external: ['cloudflare:workers'] },
  define: { 'import.meta.env.VITE_AUTH_ENABLED': JSON.stringify('false'), 'import.meta.env.VITE_STANDALONE': JSON.stringify('true') },
  plugins: [{ name: 'cloudflare-native-bindings', enforce: 'pre', resolveId(id) { if (id === 'cloudflare:workers') return { id, external: true }; } }, tailwindcss(), tanstackStart(), nitro({
    preset: 'cloudflare-module', serverDir: false,
    output: { dir: 'dist', serverDir: 'dist/server', publicDir: 'dist/client' },
    cloudflare: { deployConfig: false },
    plugins: ['./server/scheduled-recap.ts'],
  }), viteReact()],
});
