import { defineConfig } from 'vite';

export default defineConfig({
  base: '/anti-xonix/',
  test: {
    environment: 'happy-dom',
    globals: true
  }
});
