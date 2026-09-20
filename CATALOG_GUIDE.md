# Managing your product catalogue

Open `admin.html` on your deployed website and sign in with your existing admin account.

1. Select **Products**, then **Add product**.
2. Enter the name, category, price in whole Pakistani rupees, and description.
3. Upload a JPG, PNG, or WebP thumbnail up to 5 MB, or paste an HTTPS image URL. An upload takes priority over the URL. Product images are public.
4. Use **Publish on storefront** when ready. New listings start hidden. Enable **Show in New arrivals** to feature the product there.
5. Select **Save product**. The database updates immediately. Refresh the storefront to see the saved listing; product edits do not require GitHub uploads or a site deployment.

Use **Edit** to change an existing listing. Clear **Publish on storefront** to hide it while retaining existing order history. Thumbnail preview shows your chosen image before saving. If saving fails, the editor retains your inputs for retry.

## Modules

- `admin.html`: admin page and editor markup.
- `js/admin/core.js`: existing admin sign-in, orders, and customers.
- `js/admin/catalog.js`: product listing, editor, validation, preview, uploads, and saves.
- `css/admin-base.css`, `css/admin.css`, `css/catalog.css`: base admin styles, theme, and editor components.
- `js/store.js`: database-driven storefront cards, filters, search, and descriptions.
- `supabase/catalog-schema.sql`: reference for the applied database changes.

The connected database has `description`, `image_url`, and `is_new` columns and automatic product IDs. The public `product-images` bucket accepts JPG, PNG, and WebP up to 5 MB. Existing admin RLS policies protect product writes; bucket policies restrict uploads to admins. Existing storefront thumbnails were copied into the corresponding product records. Replacing a thumbnail uses a new storage path to avoid stale cached images. Old uploads are retained rather than automatically deleting potentially shared images.

The storefront uses only active database products. An empty or unavailable catalogue does not substitute demo items. Descriptions are plain text, escaped before display. The editor uses the existing Supabase admin login.
