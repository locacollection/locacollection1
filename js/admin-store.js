import { supabase } from './supabaseClient.js';
import { adminGuardReady } from './admin-guard.js';

const grid = document.getElementById('grid');
const bestGrid = document.getElementById('bestGrid');
const newGrid = document.getElementById('newGrid');
const filters = document.getElementById('filters');
const search = document.getElementById('productSearch');
const sort = document.getElementById('sort');
const count = document.getElementById('count');
const detail = document.getElementById('productModal');
let products = [];
let activeFilter = 'All';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = value => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;
const image = value => typeof value === 'string' && value ? value : 'assets/product-placeholder.svg';
const discount = product => product.old_price > product.price ? Math.round((product.old_price - product.price) / product.old_price * 100) : 0;

function matches(product) {
  const category = String(product.category || '').toLowerCase();
  if (activeFilter !== 'All' && activeFilter !== 'Sale' && category !== activeFilter.toLowerCase()) return false;
  if (activeFilter === 'Sale' && !discount(product)) return false;
  const query = search.value.trim().toLowerCase();
  return !query || `${product.name} ${product.category} ${product.description || ''}`.toLowerCase().includes(query);
}

function card(product) {
  const sale = discount(product);
  return `<article class="product" data-description="${escapeHtml(product.description || '')}">
    <div class="pic"><button class="product-image-button" type="button" data-preview-product="${product.id}" aria-label="View ${escapeHtml(product.name)} details"><img loading="lazy" src="${escapeHtml(image(product.image_url))}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='assets/product-placeholder.svg'"></button><div class="product-badges">${product.is_new ? '<span class="badge new-badge">New arrival</span>' : ''}${sale ? `<span class="badge sale-badge">SAVE ${sale}%</span>` : ''}</div><button class="heart admin-edit-product" type="button" data-edit-product="${product.id}" aria-label="Edit ${escapeHtml(product.name)}">✎</button><button class="quick-view" type="button" data-preview-product="${product.id}">Quick view</button></div>
    <div class="product-info"><div class="category-row"><span class="category">${escapeHtml(product.category || 'LOCA edit')}</span><span class="delivery-pill">LOCA edit</span></div><button class="product-title-button" type="button" data-preview-product="${product.id}"><h3>${escapeHtml(product.name)}</h3></button><div class="price">${money(product.price)}${sale ? `<span class="old">${money(product.old_price)}</span>` : ''}</div><button class="add admin-edit-product" type="button" data-edit-product="${product.id}"><span aria-hidden="true">✎</span> Edit in Admin Studio</button></div>
  </article>`;
}

function render() {
  let visible = products.filter(matches);
  if (sort.value === 'low') visible = [...visible].sort((a, b) => a.price - b.price);
  if (sort.value === 'high') visible = [...visible].sort((a, b) => b.price - a.price);
  const featured = products.filter(product => discount(product) || product.is_new).slice(0, 4);
  grid.innerHTML = visible.length ? visible.map(card).join('') : '<div class="search-empty"><h3>No matches just yet.</h3><p>Try another search or choose a different category.</p></div>';
  bestGrid.innerHTML = featured.map(card).join('');
  newGrid.innerHTML = products.filter(product => product.is_new).slice(0, 4).map(card).join('') || '<p class="catalog-empty">New arrivals are on their way.</p>';
  count.textContent = `${visible.length} product${visible.length === 1 ? '' : 's'}${activeFilter === 'All' ? '' : ` · ${activeFilter}`}`;
}

function renderFilters() {
  const categories = ['All', 'Sale', ...new Set(products.map(product => product.category).filter(Boolean))];
  filters.innerHTML = `<div class="main-filters">${categories.map(category => `<button type="button" class="filter ${category === activeFilter ? 'active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('')}</div>`;
}

function showProduct(id) {
  const product = products.find(item => String(item.id) === String(id));
  if (!product) return;
  document.getElementById('productModalImage').src = image(product.image_url);
  document.getElementById('productModalImage').alt = product.name;
  document.getElementById('productModalCategory').textContent = `LOCA / ${product.category || 'COLLECTION'}`;
  document.getElementById('productModalName').textContent = product.name;
  document.getElementById('productModalPrice').innerHTML = `<strong>${money(product.price)}</strong>${discount(product) ? `<span>${money(product.old_price)}</span>` : ''}`;
  document.getElementById('productModalDescription').textContent = product.description || 'A considered piece from the live LOCA collection.';
  document.getElementById('productModalDetails').textContent = product.description || 'Detailed product information from the live catalogue.';
  document.getElementById('productAddButton').textContent = 'Edit in Admin Studio';
  document.getElementById('productAddButton').onclick = () => window.location.assign(`admin.html?editProduct=${encodeURIComponent(product.id)}`);
  document.getElementById('productBuyButton').hidden = true;
  document.querySelector('.product-quantity')?.setAttribute('hidden', '');
  document.getElementById('productReviewForm')?.setAttribute('hidden', '');
  detail.classList.add('open');
  document.body.classList.add('lock');
}

async function start() {
  if (!await adminGuardReady) return;
  document.querySelector('.account-button')?.remove();
  document.querySelector('.bag-button')?.remove();
  document.querySelector('#accountModal')?.setAttribute('hidden', '');
  document.querySelectorAll('#mainNav a[href*="admin.html"], footer a[href*="admin.html"]').forEach(link => link.remove());
  const { data, error } = await supabase.from('products').select('id,name,category,price,old_price,image_url,description,is_new').eq('active', true).order('id');
  if (error) { grid.innerHTML = `<p class="catalog-empty">${escapeHtml(error.message)}</p>`; return; }
  products = data || [];
  renderFilters();
  render();
}

filters.addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; activeFilter = button.dataset.category; renderFilters(); render(); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); });
search.addEventListener('input', render);
sort.addEventListener('change', render);
document.addEventListener('click', event => {
  const preview = event.target.closest('[data-preview-product]');
  const edit = event.target.closest('[data-edit-product]');
  if (preview) showProduct(preview.dataset.previewProduct);
  if (edit) window.location.assign(`admin.html?editProduct=${encodeURIComponent(edit.dataset.editProduct)}`);
});
start();
window.closeProduct = () => { detail.classList.remove('open'); document.body.classList.remove('lock'); };
