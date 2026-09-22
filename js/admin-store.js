import { supabase } from './supabaseClient.js';
import { adminGuardReady } from './admin-guard.js';

const grid = document.getElementById('catalogueGrid');
const search = document.getElementById('catalogueSearch');
const count = document.getElementById('catalogueCount');
const identity = document.getElementById('adminIdentity');
const detail = document.getElementById('productDetail');
const detailBody = document.getElementById('productDetailBody');
const filters = document.getElementById('catalogueFilters');
const statProducts = document.getElementById('statProducts');
const statCategories = document.getElementById('statCategories');
let products = [];
let activeCategory = 'All';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const imageUrl = value => typeof value === 'string' && value ? value : 'assets/product-placeholder.svg';
const money = value => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;

function render() {
  const query = search.value.trim().toLowerCase();
  const visible = products.filter(product => (activeCategory === 'All' || product.category === activeCategory) && `${product.name} ${product.category} ${product.description || ''}`.toLowerCase().includes(query));
  count.textContent = `${visible.length} product${visible.length === 1 ? '' : 's'} in the current edit`;
  grid.innerHTML = visible.length ? visible.map((product, index) => `<article class="admin-preview-card">
    <div class="admin-preview-card-top"><span class="admin-preview-card-index">${String(index + 1).padStart(2, '0')}</span><img class="admin-preview-image" src="${escapeHtml(imageUrl(product.image_url))}" alt="${escapeHtml(product.name)}" loading="lazy"></div>
    <div class="admin-preview-copy"><small>${escapeHtml(product.category || 'LOCA collection')}</small><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description || 'No product description yet.')}</p><strong class="admin-preview-price">${money(product.price)}</strong><div class="admin-preview-actions"><button class="admin-preview-pill admin-preview-edit" type="button" data-preview-product="${escapeHtml(product.id)}">Quick view</button><a class="admin-preview-pill admin-preview-edit" href="admin.html?editProduct=${encodeURIComponent(product.id)}">Edit</a></div></div>
  </article>`).join('') : '<p class="admin-preview-empty">No active products match this search.</p>';
}

function renderFilters() {
  const categories = ['All', ...new Set(products.map(product => product.category).filter(Boolean))];
  filters.innerHTML = categories.map(category => `<button class="admin-preview-filter${category === activeCategory ? ' is-active' : ''}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
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
  statProducts.textContent = products.length;
  statCategories.textContent = new Set(products.map(product => product.category).filter(Boolean)).size;
  renderFilters();
  render();
}

search.addEventListener('input', render);
grid.addEventListener('click', event => {
  const button = event.target.closest('[data-preview-product]');
  if (button) showDetails(button.dataset.previewProduct);
});
filters.addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category;
  renderFilters();
  render();
});
document.getElementById('closeDetail').addEventListener('click', () => detail.close());
start();
