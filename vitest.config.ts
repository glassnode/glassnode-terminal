import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      // The source uses NodeNext-style `.js` import specifiers that point at
      // `.ts`/`.tsx` files. Vite doesn't remap those by default, so do it here.
      name: 'resolve-js-to-ts',
      enforce: 'pre',
      resolveId(source, importer) {
        if (!importer || !source.startsWith('.') || !source.endsWith('.js')) {
          return null;
        }
        const base = resolve(dirname(importer.split('?')[0]), source.slice(0, -3));
        for (const ext of ['.ts', '.tsx']) {
          if (existsSync(base + ext)) return base + ext;
        }
        return null;
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'test/**/*.spec.tsx'],
  },
});
