import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      clearMocks: true,
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
        reporter: ['text-summary', 'html'],
      },
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/**/*.test.ts'],
            exclude: ['src/**/*.int.test.{ts,tsx}'],
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            environment: 'jsdom',
            include: ['src/**/*.int.test.{ts,tsx}'],
            setupFiles: ['src/test/setup-integration.ts'],
          },
        },
      ],
    },
  }),
);
