# Deploy the website to Vercel

This configuration deploys the React website. Run the backend from `D:\sunvika\sunvika_Management_Backend_copy` on a persistent Node.js server. Native Android/iOS builds continue to use Expo/EAS.

## Vercel project

1. Import the frontend Git repository into Vercel. If using a monorepo, choose the frontend folder as Root Directory.
2. Framework: **Vite**. Install: `npm ci`. Build: `npm run build`. Output: `dist`. These settings are in `vercel.json`.
3. Add `VITE_API_URL` in Vercel Environment Variables for Production and the appropriate Preview environment. Use your public HTTPS backend URL **including `/api/v1`**, for example `https://api.example.com/api/v1`. Use the actual backend hostname, not the frontend hostname. Vercel builds reject missing, relative, localhost or insecure API URLs.
4. Deploy. Routes such as `/channel-partners`, `/calling-lists`, `/calling-reports`, `/queries` and `/set-password` are rewritten to the SPA entry point, so refresh and email links work.
5. Environment variables are embedded at build time. Redeploy after changing `VITE_API_URL`.

`VITE_*` values are public browser configuration. Keep MongoDB, JWT, SMTP and AWS credentials exclusively on the backend.

## Configure the existing backend

Set these values on the backend server and restart it. Replace example domains with your real production domains:

```dotenv
NODE_ENV=production
PUBLIC_API_URL=https://api.example.com/api/v1
FRONTEND_URL=https://app.example.com
CORS_ORIGINS=https://app.example.com
```

Use the exact frontend origin with no path or trailing slash. If keeping an existing website during migration, add its exact origin to `CORS_ORIGINS`, separated by a comma. Add only specifically approved preview URLs; do not allow all `*.vercel.app` deployments. Invitations and reset emails use `FRONTEND_URL`.

Prefer a Vercel custom frontend domain and API domain under the same parent domain, such as `app.example.com` and `api.example.com`. Production authentication uses secure HTTP-only refresh cookies. Browsers can block these as third-party cookies when unrelated site domains are used; custom domains under the same site avoid that cross-site arrangement.

API traffic goes directly to `VITE_API_URL`, including Excel and document uploads. The frontend config does not proxy file uploads through Vercel Functions. Keep the backend reverse proxy's upload-size and timeout configuration compatible with the existing 100 MB calling workbook limit.

The backend must keep running with `npm run build` and `npm start` (or the existing process manager). `src/server.ts` starts the calling allocation, bulk import and CP notification workers. Vercel static hosting does not run those workers. The backend API is **not configured for Vercel Functions** by this frontend configuration: its upload sizes and persistent workers need a separate migration first.

## Mobile

Set `EXPO_PUBLIC_API_URL=https://api.example.com/api/v1` to the same real backend endpoint before building the mobile app. Native apps require the absolute backend address; they cannot use the website's relative paths. Rebuild the app when changing this build-time value. Deploying the website does not publish a native mobile build.

## Verify after deploying

- Open `/login` and refresh `/calling-lists` directly; both should load the app.
- Sign in, reload, and confirm session refresh works. Test logout too.
- Confirm the API health endpoint returns 200 and browser API calls use the intended HTTPS hostname.
- Confirm new password-setup emails point to the Vercel frontend/custom domain.
- Test an Excel preview/upload, quotation PDF download, report export and manual import progress refresh.
- Confirm the existing backend workers continue processing scheduled notifications, CP imports and the 09:30 IST calling-sheet allocation.

## References

- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/routing/rewrites
