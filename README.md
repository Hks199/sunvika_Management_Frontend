# Sunvika Management Frontend

React, TypeScript, Vite, and Tailwind CSS frontend for the Sunvika Management API.

## Backend contract reviewed

The frontend is based on `D:\sunvika\sunvika_Management_Backend\docs\API_DOCUMENTATION.md`, module documentation, route definitions, validations, and controllers. The API defaults to `http://localhost:5000/api/v1`; success responses use `{ success, message, data, meta }` and errors use `{ success, message, errors, meta }`.

Implemented navigation and API connections cover:

- Overview: hierarchy scoped `GET /dashboard/summary`.
- Leads: list, search, pagination, record/history views, and validated lead creation.
- Site visits: list, record details, and validated visit creation.
- Customers: list, search, and record/timeline views.
- Quotations: list, record/share history views, validated quotation creation, PDF download links, and brochure generation.
- AMC: list, record/service history views, and validated contract registration.
- Employees, geography, roles and permissions, and audit records: list endpoints.
- Reports: all eight documented report kinds.
- Account sessions: list and revoke endpoints.
- Authentication: login, current employee, refresh, logout, and cookie-backed sessions.

Create forms enforce the backend's required fields and limits. Lead locations are selected through the active state → district → branch API chain; visits, quotations, and AMC records validate required IDs, dates, numeric limits, and text lengths before submission. Lead conversion requires uploading PAN, Aadhaar, electricity bill, and bank passbook documents; the backend verifies the uploaded files before creating the customer. Quotation sharing can pass the PDF to the device share menu on supported browsers; choose WhatsApp and the recipient there. Other browsers can download the PDF and attach it in WhatsApp manually. WhatsApp does not allow a website to pre-attach a file to a specific chat.

Some workflows (employee onboarding and image upload, customer conversion and document upload/verification, AMC renewal/scheduling/cancellation, and MD-only RBAC/geography mutations) are represented by their backend list/history routes where available but do not yet have full mutation forms in this frontend.

## Step 1: configure the API

Copy `.env.example` to `.env.local` and set `VITE_API_URL` to the backend origin plus its API prefix, for example:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

The local Vite server uses port `3000`, matching the backend's default `CORS_ORIGINS=http://localhost:3000`. If you use a different frontend origin, add that exact origin to the backend's comma-separated `CORS_ORIGINS` and restart the backend. Do not put API secrets in frontend environment variables; Vite values are public in the browser bundle.

## Step 2: install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The backend must be running, MongoDB must be connected, and the employee account must be active and verified. Login is rate limited by the backend.

## Step 3: production build

```bash
npm run build
npm run preview
```

Serve the built `dist/` directory over HTTPS in production. Set the backend's `FRONTEND_URL` and `CORS_ORIGINS` to the deployed frontend origin. The backend production refresh cookie is `Secure` and `SameSite=None`, so frontend and API deployment must use HTTPS and credentialed CORS.

## Deploy to Netlify

The included `netlify.toml` configures Netlify to run `npm run build`, publish `dist/`, and serve the app entry point for client-side routes such as `/login` and `/reports`.

Import the repository into Netlify and use these build settings (Netlify also reads them from `netlify.toml`):

- Build command: `npm run build`
- Publish directory: `dist`

`netlify.toml` sets `VITE_API_URL` to `/api/v1` and proxies `/api/*` to this project's production API (`https://sunvikamanagement.niakylie.com`). This makes browser API calls same-origin and avoids requiring API CORS configuration for login. Override the proxy target in `netlify.toml` if using a different backend. The backend must still set `FRONTEND_URL` to the exact HTTPS Netlify site URL (`https://sunvikamanagementhub.netlify.app`) for links it generates. If any browser feature calls the API directly instead of through the proxy, include the Netlify origin in the backend's `CORS_ORIGINS`. Do not put secrets in `VITE_*` variables; they are public in the browser bundle.

## Security and validation

- Access tokens stay in JavaScript memory and are never written to local storage or session storage. Refresh tokens are only handled as backend-managed HTTP-only cookies.
- API requests send credentials, disable caching, and retry one unauthorized request after refresh. Logout clears the local access token even if the network request fails.
- Session-dependent routes are guarded. The API remains the authorization boundary: its permission checks and hierarchy scope decide which resources a user can access.
- Login email and lead field validators reflect backend limits. Inputs have bounded lengths, text is rendered through React escaping, and raw HTML insertion is not used.
- Error messages from the API are shown as text. The frontend does not attempt to store passwords, tokens, or private document URLs.
- The UI does not infer that hidden controls make a route secure. Every API operation must still be authorized server-side.

## Backend areas

The API includes auth, employees/hierarchy, roles/RBAC, geography, leads, visits, customers/documents, quotations/sharing, dashboard/reports, AMC, audit, and health/readiness. Detailed business rules and fields live in the backend `docs/` directory; consult the corresponding validation schema before adding mutation forms.


## CP candidate calling lists

MD and MIS can upload single-sheet `.xlsx` calling lists (up to 5 MB) and assign any active RM. MIS manages its own uploads; MD manages all. Only the assigned RM can view that list among RMs; CP Head, CP and Admin Head have no calling-list access. The panel includes all-column preview, original Excel download, reassignment and reviewed row-to-CP creation for the assigned RM or MD. New CP accounts report to the assigned RM. Backend S3 permissions for `calling-lists/*` are required; see `../sunvika_Management_Backend/docs/CALLING_LISTS.md`.

MD/MIS can download a blank, header-only Excel template from the calling-list upload panel, fill candidate data from row 2 and upload the saved workbook.


Customer details now offers Convert to CP for MD, CP Head and RM. The confirmation form reviews account details and the reporting RM before sending the existing password-setup invitation. Employee details includes Customer history for converted CP accounts; original customer/history records are retained. See `../sunvika_Management_Backend/docs/CUSTOMER_CP_CONVERSION.md`.


Employees excludes CP accounts in both the all-records and downline views. Use Organization > Channel Partners to view all CP accounts permitted by your hierarchy, including inactive accounts in the all-records view. CP details retain the existing employee actions, invitations and linked customer history.
