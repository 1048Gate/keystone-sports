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
    // Rolldown can emit an undeclared `ssr_exports` namespace when the SSR
    // service entry is split across mutually-importing chunks (Beat M1 tipped
    // the graph over). Wrangler then fails `versions upload` with esbuild:
    //   "ssr_exports" is not declared in this file
    // cloudflare-module's rollupConfig forces inlineDynamicImports:false, so we
    // must disable codeSplitting via rolldownConfig (nitro's top-level
    // inlineDynamicImports flag alone is ignored for this preset).
    // Keep until Vite ships Rolldown >= 1.2.7 (rolldown#10734).
    // @see https://github.com/TanStack/router/issues/8031
    // @see https://github.com/nitrojs/nitro/issues/4533
    inlineDynamicImports: true,
    rolldownConfig: {
      output: {
        codeSplitting: false,
        inlineDynamicImports: true,
      },
    },
    rollupConfig: {
      output: {
        inlineDynamicImports: true,
      },
    },
    output: { dir: 'dist', serverDir: 'dist/server', publicDir: 'dist/client' },
    cloudflare: { deployConfig: false },
    plugins: ['./server/scheduled-recap.ts'],
  }), viteReact()],
});
