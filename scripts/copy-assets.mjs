import { cp, mkdir } from 'node:fs/promises';

await mkdir('dist/Assets', { recursive: true });
await cp('Assets', 'dist/Assets', { recursive: true });
console.log('Copied supplied game assets into dist/Assets');
