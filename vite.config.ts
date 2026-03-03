import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Укажите имя вашего репозитория вместо 'YOUR_REPO_NAME'
      // Если это основной сайт (username.github.io), оставьте '/'
      base: '/GSF/', 
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
},
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});