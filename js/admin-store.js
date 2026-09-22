import { supabase } from './supabaseClient.js';
import { adminGuardReady } from './admin-guard.js';

const grid = document.getElementById('catalogueGrid');
const search = document.getElementById('catalogueSearch');
const count = document.getElementById('catalogueCount');
const identity = document.getElementById('adminIdentity');
const detail = document.getElementById('productDetail');
const detailBody = document.getElementById('productDetailBody');
let products = [];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const imageUrl = value => typeof value === 'string' && value ? value : 'assets/product-placeholder.svg';
const money = value => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;

function render() {
  const query = search.value.trim().toLowerCase();
  const visible = products.filter(product => `${product.name} ${product.category} ${product.description || ''}`.toLowerCase().includes(query));
  count.textContent = `${visible.length} product${visible.length === 1 ? '' : 's'} · read-only preview`;
  grid.innerHTML = visible.length ? visible.map(product => `<article class="admin-preview-card">
    <img class="admin-preview-image" src="${escapeHtml(imageUrl(product.image_url))}" alt="${escapeHtml(product.name)}" loading="lazy">
    <div class="admin-preview-copy"><small>${escapeHtml(product.category || 'LOCA collection')}</small><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description || 'No product description yet.')}</p><strong class="admin-preview-price">${money(product.price)}</strong><div class="admin-preview-actions"><button class="admin-preview-pill admin-preview-edit" type="button" data-preview-product="${escapeHtml(product.id)}">Inspect details</button><a class="admin-preview-pill admin-preview-edit" href="admin.html?editProduct=${encodeURIComponent(product.id)}">Edit in Admin Studio</a></div></div>
  </article>`).join('') : '<p class="admin-preview-empty">No active products match this search.</p>';
}

function showDetails(id) {
  const product = products.find(item => String(item.id) === String(id));
  if (!product) return;
  detailBody.innerHTML = `<p class="admin-preview-kicker">${escapeHtml(product.category || 'LOCA collection')}</p><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description || 'No product description yet.')}</p><strong>${money(product.price)}</strong>`;
  detail.showModal();
}

async function start() {
  const allowed = await adminGuardReady;
  if (!allowed) return;
  const { data: { user } = {} } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('admin_identifier').eq('id', user.id).maybeSingle();
  identity.textContent = profile?.admin_identifier || 'ADMIN_LOCA1';
  const { data, error } = await supabase.from('products').select('id,name,category,price,image_url,description').eq('active', true).order('id');
  if (error) {
    grid.innerHTML = `<p class="admin-preview-empty admin-preview-error">${escapeHtml(error.message)}</p>`;
    return;
  }
  products = data || [];
  render();
}

search.addEventListener('input', render);
grid.addEventListener('click', event => {
  const button = event.target.closest('[data-preview-product]');
  if (button) showDetails(button.dataset.previewProduct);
});
document.getElementById('closeDetail').addEventListener('click', () => detail.close());
start();
