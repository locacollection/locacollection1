LOCA COLLECTION - CUSTOMER ACCOUNT UPGRADE

WHAT THIS ADDS
- Proper Supabase Auth sign up, sign in and sign out
- One private profile per customer
- One private database cart per customer
- Guest cart that merges into the customer's account when they sign in
- Same account cart on different browsers/devices
- My Account profile editor
- My Orders / order status history
- Every new order linked to the signed-in user
- Row Level Security so one customer cannot read another customer's profile/cart/orders

UPLOAD TO GITHUB
Keep admin.html unchanged.
Upload/replace these storefront files:
  index.html
  css/style.css
  js/config.js
  js/ui.js
  js/store.js
  js/cart.js
  js/orders.js
  js/auth.js
  js/main.js

The old js/app.js is no longer loaded by index.html. You may keep it in the repo for backup or delete it later.

SUPABASE
1. Open Supabase Dashboard -> SQL Editor.
2. Open supabase/LOCA_customer_accounts.sql from this package.
3. Paste the whole SQL file and click Run once.
4. Do not use or expose your Supabase service-role/secret key. The website uses only your publishable key.

IMPORTANT ORDER
Run the SQL first, then upload the new storefront files. Otherwise the new cart/profile code will look for tables that do not exist yet.

TEST
1. Open website in Incognito without signing in. Add product. Checkout should ask for sign-in.
2. Create Customer A and sign in. Guest cart should merge into Customer A.
3. Open another browser/device and sign in as Customer A. Same cart should load.
4. Sign out. Customer A cart/profile should disappear from that browser.
5. Sign in as Customer B. Customer B should see only their own cart/profile/orders.
6. Place an order as Customer A. Open My Account and verify Order History.
