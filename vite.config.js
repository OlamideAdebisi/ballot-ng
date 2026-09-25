import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  plugins: [{
    name: 'inject-supabase-config',
    transformIndexHtml(html) {
      const config = `window.SUPABASE_CONFIG = ${JSON.stringify({
        url: env.VITE_SUPABASE_URL || '',
        publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
      })};`;
      return html.replace('</head>', `<script>${config}</script></head>`);
    }
  }],
  server: {
    port: 5173,
    host: true
  }
  };
});
