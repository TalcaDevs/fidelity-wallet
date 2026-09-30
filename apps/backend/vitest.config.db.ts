import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Contra una BD de Supabase real con las migraciones aplicadas (job db-tests de la CI).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/db/**/*.db-spec.ts'],
    fileParallelism: false,
  },
});
