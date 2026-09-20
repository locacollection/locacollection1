window.LOCA = window.LOCA || {};

function cartEntries(){
  return Object.entries(LOCA.cart || {}).filter(([,q]) => Number(q) > 0);
}

function cartTotal(){
  return cartEntries().reduce((sum, [id, q]) => {
    const p = LOCA.products.find(x => String(x.id) === String(id));
    return sum + (p ? p.price * Number(q) : 0);
  }, 0);
}

let selectedCheckoutAddressId = 'default';

function renderCheckoutAddressOptions(){
  const wrapper = document.getElementById("checkoutSavedWrapper");
  const pills = document.getElementById("coAddressPills");
  const preview = document.getElementById("coActiveAddressPreview");
  if(!wrapper || !pills) return;

  const p = LOCA.profile || {};
  const saved = (LOCA.getSavedAddresses ? LOCA.getSavedAddresses() : []);

  // Construct options list
  const options = [];
  if(p.address || p.full_name || p.city){
    options.push({
      id: 'default',
      title: 'Default Profile',
      name: p.full_name || '',
      phone: p.phone || '',
      city: p.city || '',
      address: p.address || '',
      isDefault: true
    });
  }

  saved.forEach(addr => {
    options.push(addr);
  });

  if(!options.length){
    wrapper.style.display = 'none';
    return;
  }

  wrapper.style.display = 'block';

  // If no current selection or invalid selection, pick default
  const defaultOption = options.find(o => o.isDefault) || options[0];
  if(!options.some(o => o.id === selectedCheckoutAddressId)){
    selectedCheckoutAddressId = defaultOption.id;
  }

  pills.innerHTML = options.map(opt => `
    <button type="button" class="co-address-pill ${opt.id === selectedCheckoutAddressId ? 'active' : ''}" onclick="selectCheckoutAddress('${opt.id}')">
      <span>${LOCA.esc(opt.title || 'Address')}</span>
      ${opt.isDefault ? '<span class="badge-default">DEFAULT</span>' : ''}
    </button>
  `).join("");

  const active = options.find(o => o.id === selectedCheckoutAddressId) || defaultOption;
  if(active){
    if(preview){
      preview.textContent = `Delivering to: ${active.name || p.full_name || 'Customer'} · ${active.phone || p.phone || ''} · ${active.address}, ${active.city}`;
    }
    applyAddressToCheckout(active);
  }
}

function applyAddressToCheckout(addr){
  if(!addr) return;
  const nameEl = document.getElementById("coName");
  const phoneEl = document.getElementById("coPhone");
  const addrEl = document.getElementById("coAddress");
  const cityEl = document.getElementById("coCity");

  if(nameEl && addr.name) nameEl.value = addr.name;
  if(phoneEl && addr.phone) phoneEl.value = addr.phone;
  if(addrEl && addr.address) addrEl.value = addr.address;
  if(cityEl && addr.city) cityEl.value = addr.city;
}

function selectCheckoutAddress(id){
  selectedCheckoutAddressId = id;
  const p = LOCA.profile || {};
  const saved = (LOCA.getSavedAddresses ? LOCA.getSavedAddresses() : []);
  let found = null;
  if(id === 'default'){
    found = {
      id: 'default',
      title: 'Default Profile',
      name: p.full_name || '',
      phone: p.phone || '',
      city: p.city || '',
      address: p.address || '',
      isDefault: true
    };
  } else {
    found = saved.find(a => a.id === id);
  }
  renderCheckoutAddressOptions();
  if(found) applyAddressToCheckout(found);
}

async function openCheckout(){
  if(!cartEntries().length){
    alert("Your bag is empty.");
    return;
  }
  const {data:{session}} = await LOCA.db.auth.getSession();
  if(!session?.user){
    openAuth("signin");
    alert("Please sign in or create a LOCA account before checkout.");
    return;
  }

  LOCA.currentUser = session.user;
  try { await LOCA.ensureProfile(); } catch(err){ console.warn(err); }
  const p = LOCA.profile || {};
  document.getElementById("coName").value = p.full_name || "";
  document.getElementById("coPhone").value = p.phone || "";
  document.getElementById("coEmail").value = session.user.email || "";
  document.getElementById("coAddress").value = p.address || "";
  document.getElementById("coCity").value = p.city || "";
  document.getElementById("coTotal").textContent = LOCA.money(cartTotal());
  
  // Render quick saved addresses picker
  renderCheckoutAddressOptions();

  document.getElementById("checkoutModal")?.classList.add("open");
  document.body.classList.add("lock");
}

function closeCheckout(){
  document.getElementById("checkoutModal")?.classList.remove("open");
  document.body.classList.remove("lock");
}

async function saveCheckoutProfile(){
  if(!LOCA.currentUser) return;
  const payload = {
    id: LOCA.currentUser.id,
    email: LOCA.currentUser.email || "",
    full_name: document.getElementById("coName").value.trim(),
    phone: document.getElementById("coPhone").value.trim(),
    address: document.getElementById("coAddress").value.trim(),
    city: document.getElementById("coCity").value.trim(),
    updated_at: new Date().toISOString()
  };
  const {data, error} = await LOCA.db.from("profiles").upsert(payload).select("*").single();
  if(error) throw error;
  LOCA.profile = data;
}

async function placeOrder(event){
  event.preventDefault();
  if(!cartEntries().length) return;

  const {data:{user}} = await LOCA.db.auth.getUser();
  if(!user){
    closeCheckout();
    openAuth("signin");
    alert("Sign in is required before placing an order.");
    return;
  }

  LOCA.currentUser = user;
  const button = event.target.querySelector("button[type='submit']") || event.target.querySelector("button:last-child");
  if(button){ button.disabled = true; button.textContent = "Placing order..."; }

  try{
    await saveCheckoutProfile();
    const items = cartEntries().map(([id, quantity]) => ({
      product_id: Number(id),
      quantity: Number(quantity)
    }));

    const {data, error} = await LOCA.db.rpc("place_order", {
      p_name: document.getElementById("coName").value.trim(),
      p_phone: document.getElementById("coPhone").value.trim(),
      p_email: user.email || "",
      p_address: document.getElementById("coAddress").value.trim(),
      p_city: document.getElementById("coCity").value.trim(),
      p_payment: document.getElementById("coPayment").value,
      p_items: items
    });
    if(error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    const orderNo = result?.order_number || result?.order_no || result?.id || "LOCA-ORDER";
    await clearCart();
    closeCheckout();
    document.getElementById("drawer")?.classList.remove("open");
    document.getElementById("overlay")?.classList.remove("open");
    document.body.classList.remove("lock");
    event.target.reset();
    alert("Order placed successfully. Order ID: " + orderNo + "\n\nThank you for shopping with LOCA COLLECTION.");
  } catch(err){
    console.error(err);
    alert("Order could not be placed.\n\n" + (err.message || "Connection error"));
  } finally {
    if(button){ button.disabled = false; button.textContent = "Place Order ↗"; }
  }
}

async function loadMyOrders(){
  const box = document.getElementById("myOrders");
  if(!box || !LOCA.currentUser) return;
  box.innerHTML = '<div class="account-loading">Loading orders...</div>';
  try{
    const {data: orders, error} = await LOCA.db.from("orders").select("*").eq("user_id", LOCA.currentUser.id).order("created_at", {ascending:false});
    if(error) throw error;
    if(!orders?.length){
      box.innerHTML = '<div class="orders-empty">No orders yet.</div>';
      return;
    }

    const ids = orders.map(o => o.id);
    let items = [];
    if(ids.length){
      const itemsResult = await LOCA.db.from("order_items").select("*").in("order_id", ids);
      if(!itemsResult.error) items = itemsResult.data || [];
    }

    box.innerHTML = orders.map(order => {
      const count = items.filter(i => String(i.order_id) === String(order.id))
        .reduce((sum, i) => sum + Number(i.quantity || i.qty || 0), 0);
      const no = order.order_number || order.order_no || order.id;
      return `<article class="order-card">
        <div><strong>${no}</strong><span>${new Date(order.created_at).toLocaleDateString("en-PK")}</span></div>
        <div class="order-card-right"><b>${LOCA.money(order.total)}</b><span class="order-status">${order.status || "Pending"}</span></div>
        <small>${count ? count + " item" + (count === 1 ? "" : "s") : "Order received"}</small>
      </article>`;
    }).join("");
  } catch(err){
    console.error(err);
    box.innerHTML = '<div class="orders-empty">Orders could not be loaded.</div>';
  }
}

window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;
window.placeOrder = placeOrder;
window.loadMyOrders = loadMyOrders;
window.selectCheckoutAddress = selectCheckoutAddress;
window.renderCheckoutAddressOptions = renderCheckoutAddressOptions;
