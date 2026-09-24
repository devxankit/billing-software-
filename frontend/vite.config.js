import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    appType: 'spa',
    plugins: [react(), tailwindcss()],
    resolve: {
      // Vite sometimes fails to infer named exports from react-is/index.js
      // because it conditionally requires prod/dev builds.
      // Alias to a concrete CJS file so named exports like `isFragment` work.
      alias: {
        'react-is': isProd
          ? 'react-is/cjs/react-is.production.js'
          : 'react-is/cjs/react-is.development.js',
      },
    },
    server: {
      host: true, // expose on network: http://10.174.225.158:5173
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      exclude: ['dayjs/locale/*'],
    },
  }
})
