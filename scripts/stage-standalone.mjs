import { cp, mkdir, writeFile } from 'node:fs/promises';
await writeFile('dist/server/index.js', "export { default } from './index.mjs';\n");
await mkdir('dist/.openai', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/.openai/drizzle', { recursive: true });
