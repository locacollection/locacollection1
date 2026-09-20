window.LOCA = window.LOCA || {};
LOCA.GUEST_CART_KEY = "loca_guest_cart_v2";
LOCA.LEGACY_CART_KEY = "loca_cart_new";

LOCA.readGuestCart = function(){
  try{
    const raw = localStorage.getItem(LOCA.GUEST_CART_KEY) || localStorage.getItem(LOCA.LEGACY_CART_KEY);
    if(!raw) return {};
    const parsed = JSON.parse(raw);
    const out = {};
    if(Array.isArray(parsed)){
      parsed.forEach(id => {
        const key = String(id);
        out[key] = Math.min(20, (out[key] || 0) + 1);
      });
    } else if(parsed && typeof parsed === "object"){
      Object.entries(parsed).forEach(([id, quantity]) => {
        const q = Math.max(0, Math.min(20, Number(quantity) || 0));
        if(q > 0) out[String(id)] = q;
      });
    }
    return out;
  } catch(err){
    console.warn("Could not read guest cart", err);
    return {};
  }
};

LOCA.writeGuestCart = function(cart){
  localStorage.setItem(LOCA.GUEST_CART_KEY, JSON.stringify(cart || {}));
  localStorage.removeItem(LOCA.LEGACY_CART_KEY);
};

LOCA.cartTotalQuantity = function(){
  return Object.values(LOCA.cart || {}).reduce((sum, q) => sum + Number(q || 0), 0);
};

LOCA.loadServerCart = async function(userId){
  const {data, error} = await LOCA.db.from("cart_items").select("product_id,quantity").eq("user_id", userId);
  if(error) throw error;
  const cart = {};
  (data || []).forEach(row => {
    if(Number(row.quantity) > 0) cart[String(row.product_id)] = Number(row.quantity);
  });
  return cart;
};

LOCA.mergeGuestCartIntoAccount = async function(userId){
  const guest = LOCA.readGuestCart();
  if(!Object.keys(guest).length) return;
  const server = await LOCA.loadServerCart(userId);
  const rows = Object.entries(guest).map(([product_id, quantity]) => ({
    user_id: userId,
    product_id: Number(product_id),
    quantity: Math.min(20, Number(quantity) + Number(server[product_id] || 0)),
    updated_at: new Date().toISOString()
  }));
  if(rows.length){
    const {error} = await LOCA.db.from("cart_items").upsert(rows, {onConflict:"user_id,product_id"});
    if(error) throw error;
  }
  LOCA.writeGuestCart({});
};

LOCA.loadCart = async function({mergeGuest = false} = {}){
  if(LOCA.cartSyncBusy) return;
  LOCA.cartSyncBusy = true;
  try{
    if(LOCA.currentUser){
      if(mergeGuest) await LOCA.mergeGuestCartIntoAccount(LOCA.currentUser.id);
      LOCA.cart = await LOCA.loadServerCart(LOCA.currentUser.id);
    } else {
      LOCA.cart = LOCA.readGuestCart();
    }
    drawCart();
  } catch(err){
    console.error("Cart sync failed:", err);
    if(!LOCA.currentUser) LOCA.cart = LOCA.readGuestCart();
    drawCart();
  } finally {
    LOCA.cartSyncBusy = false;
  }
};

LOCA.persistCartItem = async function(productId, quantity){
  const id = String(productId);
  if(LOCA.currentUser){
    if(quantity <= 0){
      const {error} = await LOCA.db.from("cart_items").delete().eq("user_id", LOCA.currentUser.id).eq("product_id", Number(productId));
      if(error) throw error;
    } else {
      const {error} = await LOCA.db.from("cart_items").upsert({
        user_id: LOCA.currentUser.id,
        product_id: Number(productId),
        quantity: Math.min(20, quantity),
        updated_at: new Date().toISOString()
      }, {onConflict:"user_id,product_id"});
      if(error) throw error;
    }
  } else {
    if(quantity <= 0) delete LOCA.cart[id];
    else LOCA.cart[id] = Math.min(20, quantity);
    LOCA.writeGuestCart(LOCA.cart);
  }
};

async function add(id){
  const key = String(id);
  const next = Math.min(20, Number(LOCA.cart[key] || 0) + 1);
  LOCA.cart[key] = next;
  drawCart();
  try { await LOCA.persistCartItem(id, next); }
  catch(err){
    console.error(err);
    alert("Cart could not sync. Please try again.");
    await LOCA.loadCart();
  }
  openCartDrawer();
}

async function removeItem(id){
  const key = String(id);
  delete LOCA.cart[key];
  drawCart();
  try { await LOCA.persistCartItem(id, 0); }
  catch(err){ console.error(err); await LOCA.loadCart(); }
}

async function changeCartQty(id, delta){
  const key = String(id);
  const next = Math.max(0, Math.min(20, Number(LOCA.cart[key] || 0) + Number(delta || 0)));
  if(next === 0) delete LOCA.cart[key]; else LOCA.cart[key] = next;
  drawCart();
  try { await LOCA.persistCartItem(id, next); }
  catch(err){ console.error(err); await LOCA.loadCart(); }
}

async function clearCart(){
  if(LOCA.currentUser){
    const {error} = await LOCA.db.from("cart_items").delete().eq("user_id", LOCA.currentUser.id);
    if(error) throw error;
  } else {
    LOCA.writeGuestCart({});
  }
  LOCA.cart = {};
  drawCart();
}

function drawCart(){
  const box = document.getElementById("cartItems");
  const foot = document.getElementById("cartFoot");
  if(!box || !foot) return;

  const entries = Object.entries(LOCA.cart || {}).filter(([,q]) => Number(q) > 0);
  if(!entries.length){
    box.innerHTML = '<div class="empty">Your bag is waiting for something good.</div>';
    foot.innerHTML = "";
    updateCartBadge();
    return;
  }

  box.innerHTML = entries.map(([id, q]) => {
    const p = LOCA.products.find(x => String(x.id) === String(id));
    if(!p) return "";
    return `<div class="cart-item">
      <div class="mini"><img src="${LOCA.escape(LOCA.safeImage(p.image))}" alt=""></div>
      <div class="cart-item-copy">
        <strong>${LOCA.escape(p.name)}</strong>
        <p>${LOCA.money(p.price)}</p>
        <div class="qty-row">
          <button type="button" onclick="changeCartQty(${id},-1)">−</button>
          <span>${q}</span>
          <button type="button" onclick="changeCartQty(${id},1)">+</button>
          <button type="button" class="remove-link" onclick="removeItem(${id})">Remove</button>
        </div>
      </div>
    </div>`;
  }).join("");

  const total = entries.reduce((sum, [id, q]) => {
    const p = LOCA.products.find(x => String(x.id) === String(id));
    return sum + (p ? p.price * Number(q) : 0);
  }, 0);
  foot.innerHTML = `<div class="cart-summary"><span>Subtotal</span><strong>${LOCA.money(total)}</strong></div>
    <button class="btn" style="width:100%" onclick="openCheckout()">Checkout ↗</button>`;
  updateCartBadge();
}

function updateCartBadge(){
  const badge = document.getElementById("cartCount");
  if(!badge) return;
  const qty = LOCA.cartTotalQuantity();
  badge.textContent = qty > 99 ? "99+" : String(qty);
  badge.hidden = qty === 0;
}

function openCartDrawer(){
  document.getElementById("drawer")?.classList.add("open");
  document.getElementById("overlay")?.classList.add("open");
  document.body.classList.add("lock");
}

function toggleCart(){
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("overlay");
  if(!drawer || !overlay) return;
  drawer.classList.toggle("open");
  overlay.classList.toggle("open");
  document.body.classList.toggle("lock", drawer.classList.contains("open"));
}

window.add = add;
window.removeItem = removeItem;
window.changeCartQty = changeCartQty;
window.clearCart = clearCart;
window.drawCart = drawCart;
window.toggleCart = toggleCart;
window.openCartDrawer = openCartDrawer;

