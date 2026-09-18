# LOCA COLLECTION — GitHub Pages Admin + Order Management

This version adds a browser-only admin panel and order workflow.

## Files
- `index.html` — storefront + checkout form
- `admin.html` — admin dashboard
- `README.md` — instructions

## GitHub Pages
Upload `index.html` and `admin.html` to the repository root. Keep Pages set to:
- Branch: `main`
- Folder: `/(root)`

Admin URL:
`https://locacollection.github.io/loca-collection/admin.html`

## Demo admin login
Email: `admin@locacollection.pk`
Password: `LOCA2026`

## Important
This is a static GitHub Pages implementation. Orders are stored in the browser's `localStorage`, so the admin panel only sees orders created in the same browser/device/profile. The login is not secure production authentication and payments are not processed.

For real customers and real orders, the next step is a hosted backend/database plus secure authentication and a payment provider.
