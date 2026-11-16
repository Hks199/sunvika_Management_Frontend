import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const values = loadEnv(mode, process.cwd(), 'VITE_');
  if (process.env.VERCEL === '1') {
    const apiUrl = process.env.VITE_API_URL || values.VITE_API_URL;
    let valid = false;
    try {
      const url = new URL(apiUrl || '');
      valid = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
        && !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
    } catch { /* Report a configuration error without logging environment values. */ }
    if (!valid) throw new Error('Set VITE_API_URL in Vercel to the public HTTPS backend URL including /api/v1, then redeploy.');
  }
  return { plugins: [react()], server: { host: 'localhost', port: 3000, strictPort: true } };
});
