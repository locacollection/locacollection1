const SUPABASE_URL =
(window.LOCA && window.LOCA.SUPABASE_URL) ||
"https://qvvrjogeqranowfseivh.supabase.co";

const SUPABASE_KEY =
(window.LOCA && window.LOCA.SUPABASE_KEY) ||
"sb_publishable_IP9PzAVXsVwcqNWenmdmLg_ACtzSDMB";

const db =
(window.LOCA && window.LOCA.db) ||
supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

let orders=[];
let customers=[];
let profiles=[];
let orderItems=[];
let products=[];
let expandedCustomerKeys = new Set();


const money = value =>
"PKR " +
Number(value || 0).toLocaleString("en-PK");


const esc = value =>
String(value ?? "").replace(
/[&<>"]/g,
x => ({
"&":"&amp;",
"<":"&lt;",
">":"&gt;",
'"':"&quot;"
}[x])
);


async function isCurrentUserAdmin(){

const {
data:{user},
error
} =
await db.auth.getUser();

if(error || !user){
return false;
}

const result =
await db.rpc("is_admin");

if(result.error){
throw result.error;
}

return result.data === true;
}


async function login(){

const email =
document.getElementById("adminEmail").value.trim();

const password =
document.getElementById("adminPass").value;

const errorBox =
document.getElementById("loginError");

errorBox.textContent="Signing in...";

try{

const result =
await db.auth.signInWithPassword({
email,
password
});

if(result.error){
throw result.error;
}

if(!result.data.session){
throw new Error("Login session was not created.");
}

const admin =
await isCurrentUserAdmin();

if(!admin){

await db.auth.signOut();

throw new Error(
"This account is not authorized as an admin."
);

}

errorBox.textContent="";

document.getElementById("login")
.style.display="none";

document.getElementById("app")
.style.display="block";

await load();

}catch(error){

console.error(error);

errorBox.textContent =
error.message ||
"Sign in failed.";

}

}


async function logout(){

await db.auth.signOut();

location.reload();

}


async function load(){

const [
ordersResult,
customersResult,
itemsResult,
productsResult,
profilesResult
] = await Promise.all([

db.from("orders")
.select("*")
.order("created_at",{ascending:false}),

db.from("customers")
.select("*"),

db.from("order_items")
.select("*"),

db.from("products")
.select("*")
.order("id"),

db.from("profiles")
.select("*")

]);


if(ordersResult.error)
throw ordersResult.error;

if(customersResult.error)
throw customersResult.error;

if(itemsResult.error)
throw itemsResult.error;

if(productsResult.error)
throw productsResult.error;


orders=ordersResult.data || [];
customers=customersResult.data || [];
orderItems=itemsResult.data || [];
products=productsResult.data || [];
profiles=(profilesResult && !profilesResult.error) ? (profilesResult.data || []) : [];


renderStats();
renderOrders();
renderCustomers();
renderProducts();

}


function customer(order){

return customers.find(
x =>
String(x.id) ===
String(order.customer_id)
) || {};

}


function items(order){

return orderItems.filter(
x =>
String(x.order_id) ===
String(order.id)
);

}


function renderStats(){

const pending =
orders.filter(x=>x.status==="Pending").length;

const delivered =
orders.filter(x=>x.status==="Delivered").length;

const revenue =
orders
.filter(x=>x.status!=="Cancelled")
.reduce(
(sum,x)=>sum+Number(x.total||0),
0
);

document.getElementById("stats").innerHTML=`

<div class="stat">
<span class="muted">Total orders</span>
<b>${orders.length}</b>
</div>

<div class="stat">
<span class="muted">Pending</span>
<b>${pending}</b>
</div>

<div class="stat">
<span class="muted">Delivered</span>
<b>${delivered}</b>
</div>

<div class="stat">
<span class="muted">Revenue</span>
<b>${money(revenue)}</b>
</div>

`;

}


function renderOrders(){

const query =
document.getElementById("search")
.value
.toLowerCase();

const status =
document.getElementById("filter")
.value;


const list =
orders.filter(order=>{

const c=customer(order);

const text=(
(order.order_number || order.order_no || order.id) +
" " +
(c.name || "") +
" " +
(c.phone || "") +
" " +
(c.email || "")
).toLowerCase();

return (
(status==="All" || order.status===status)
&& text.includes(query)
);

});


document.getElementById("orderCount")
.textContent=list.length+" shown";


document.getElementById("ordersBody")
.innerHTML=list.length

? list.map(order=>{

const c=customer(order);
const its=items(order);

const count =
its.reduce(
(sum,x)=>
sum+Number(
x.quantity ||
x.qty ||
0
),
0
);


return`

<tr>

<td>
<b>${esc(
order.order_number ||
order.order_no ||
order.id
)}</b>
<br>
<span class="muted">
${new Date(order.created_at).toLocaleString()}
</span>
</td>

<td>
<b>${esc(c.name)}</b>
<br>
${esc(c.city)}
<br>
<span class="muted">
${esc(c.phone)}
</span>
</td>

<td>${count}</td>

<td><b>${money(order.total)}</b></td>

<td>${esc(order.payment_method || "")}</td>

<td>

<span class="status ${esc(order.status)}">
${esc(order.status)}
</span>

<br>

<select
style="margin-top:6px"
onchange="changeStatus('${order.id}',this.value)"
>

${[
"Pending",
"Confirmed",
"Shipped",
"Delivered",
"Cancelled"
].map(x=>`

<option
${x===order.status?"selected":""}>
${x}
</option>

`).join("")}

</select>

</td>

<td>

<button
class="smallbtn"
onclick="viewOrder('${order.id}')">
View
</button>

</td>

</tr>

`;

}).join("")

:`

<tr>
<td colspan="7" class="empty">
No orders found.
</td>
</tr>

`;

}


async function changeStatus(id,status){

const result =
await db
.from("orders")
.update({status})
.eq("id",id);

if(result.error){

alert(result.error.message);

return;

}

await load();

}


function getCustomerOrders(c) {
return orders.filter(o => {
const cust = customer(o);
if (c.user_id && o.user_id && String(o.user_id) === String(c.user_id)) return true;
if (c.id && cust.id && String(cust.id) === String(c.id)) return true;
if (c.email && cust.email && c.email.toLowerCase() === cust.email.toLowerCase()) return true;
if (c.phone && cust.phone && c.phone === cust.phone) return true;
return false;
});
}

function toggleCustomerExpand(key) {
if (expandedCustomerKeys.has(key)) {
expandedCustomerKeys.delete(key);
} else {
expandedCustomerKeys.add(key);
}
renderCustomers();
}

function renderCustomers(){
const map={};

// First integrate registered user profiles
(profiles || []).forEach(p => {
const key = p.id || p.email;
if (!key) return;
map[key] = {
id: p.id,
user_id: p.id,
name: p.full_name || p.name || p.email.split('@')[0],
email: p.email || "",
phone: p.phone || "",
city: p.city || "",
address: p.address || "",
is_registered: true,
orders: 0,
spent: 0
};
});

// Also include all customers from the orders/customers table
customers.forEach(c => {
const key = c.email || c.phone || c.id || c.name;
if (!key) return;
if (!map[key]) {
map[key] = {
...c,
user_id: c.user_id || c.id,
orders: 0,
spent: 0
};
} else {
if (!map[key].phone && c.phone) map[key].phone = c.phone;
if (!map[key].city && c.city) map[key].city = c.city;
if (!map[key].address && c.address) map[key].address = c.address;
}
});

// Now calculate orders and total spent accurately
Object.keys(map).forEach(key => {
const userEntry = map[key];
const userOrders = getCustomerOrders(userEntry);
userEntry.orders = userOrders.length;
userEntry.spent = userOrders
.filter(o => o.status !== "Cancelled")
.reduce((sum, o) => sum + Number(o.total || 0), 0);
userEntry._ordersList = userOrders;
});

// Also add any one-off orders whose customer details didn't match existing map
orders.forEach(order => {
const c = customer(order);
const key = c.email || c.phone || c.id || c.name;
if (key && !map[key]) {
const userOrders = getCustomerOrders(c);
map[key] = {
...c,
orders: userOrders.length,
spent: userOrders.filter(o => o.status !== "Cancelled").reduce((sum, o) => sum + Number(o.total || 0), 0),
_ordersList: userOrders
};
}
});

let list = Object.values(map);

// Customer search filter
const q = (document.getElementById("customerSearch")?.value || "").trim().toLowerCase();
if (q) {
list = list.filter(c => 
(c.name || "").toLowerCase().includes(q) ||
(c.email || "").toLowerCase().includes(q) ||
(c.phone || "").toLowerCase().includes(q) ||
(c.city || "").toLowerCase().includes(q)
);
}

const countEl = document.getElementById("customerCount");
if (countEl) {
countEl.textContent = `${list.length} user${list.length === 1 ? '' : 's'} registered / recorded. Click 'Sub-Orders' to see all orders from each user.`;
}

// Read saved addresses from local storage for multi-address preview
let allLocalProfiles = {};
try {
for (let i = 0; i < localStorage.length; i++) {
const k = localStorage.key(i);
if (k && k.startsWith('loca_addresses_')) {
const uid = k.replace('loca_addresses_', '');
allLocalProfiles[uid] = JSON.parse(localStorage.getItem(k) || '[]');
}
}
} catch(e) {}

document.getElementById("customersBody").innerHTML = list.length
? list.map((c, idx) => {
const key = String(c.id || c.email || c.phone || idx);
const isExpanded = expandedCustomerKeys.has(key);
const userOrders = c._ordersList || getCustomerOrders(c);
const savedAddresses = (c.user_id && allLocalProfiles[c.user_id]) ? allLocalProfiles[c.user_id] : [];

let subOrdersHtml = '';
if (isExpanded) {
subOrdersHtml = `
<tr class="customer-expand-row">
<td colspan="7">
<div class="customer-suborders">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
<h4>All Orders from ${esc(c.name)} (${userOrders.length})</h4>
<button class="smallbtn" onclick="toggleCustomerExpand('${esc(key)}')">Hide sub-orders ▲</button>
</div>

${userOrders.length ? `
<table class="suborders-table">
<thead>
<tr>
<th>Order #</th>
<th>Date</th>
<th>Delivery Address</th>
<th>Payment</th>
<th>Total</th>
<th>Status</th>
<th>Action</th>
</tr>
</thead>
<tbody>
${userOrders.map(o => `
<tr>
<td><b>${esc(o.order_number || o.order_no || o.id)}</b></td>
<td><span class="muted">${new Date(o.created_at).toLocaleString('en-PK')}</span></td>
<td>${esc(customer(o).address || c.address || '—')}<br><small class="muted">${esc(customer(o).city || c.city || '')}</small></td>
<td>${esc(o.payment_method || 'COD')}</td>
<td><b>${money(o.total)}</b></td>
<td><span class="status ${esc(o.status)}">${esc(o.status)}</span></td>
<td><button class="smallbtn" onclick="viewOrder('${o.id}')">Inspect</button></td>
</tr>
`).join('')}
</tbody>
</table>
` : `<p class="muted" style="margin:8px 0">No orders placed by this user yet.</p>`}

<div class="customer-addresses-preview">
<strong>Primary &amp; Saved Addresses for User:</strong>
<div style="font-size:12px;line-height:1.6">
<div>📍 <b>Primary/Default Address:</b> ${esc(c.address || 'Not set')}, ${esc(c.city || 'Pakistan')} ${c.phone ? `· 📞 ${esc(c.phone)}` : ''}</div>
${savedAddresses.length ? `
<div style="margin-top:8px">
<b style="color:#2d6a4f">Alternate Saved Delivery Addresses (${savedAddresses.length}):</b>
<ul style="margin:4px 0 0 18px;padding:0">
${savedAddresses.map(a => `
<li><b>${esc(a.title || 'Address')}:</b> ${esc(a.address)}, ${esc(a.city)} (Recipient: ${esc(a.name || c.name)}, ${esc(a.phone || c.phone)}) ${a.isDefault ? '<span class="badge-default">DEFAULT</span>' : ''}</li>
`).join('')}
</ul>
</div>
` : ''}
</div>
</div>

</div>
</td>
</tr>
`;
}

return `
<tr>
<td>
<b>${esc(c.name)}</b>
${c.is_registered ? `<span style="font-size:9px;background:#e1eee7;color:#2d6a4f;padding:2px 5px;border-radius:4px;margin-left:4px">Registered</span>` : ''}
</td>
<td>${esc(c.phone || "—")}</td>
<td>${esc(c.email || "—")}</td>
<td>${esc(c.city || "—")}</td>
<td><b>${c.orders}</b></td>
<td><b>${money(c.spent)}</b></td>
<td>
<button class="smallbtn" onclick="toggleCustomerExpand('${esc(key)}')">
${isExpanded ? 'Hide sub-orders ▲' : 'View sub-orders ▼'}
</button>
</td>
</tr>
${subOrdersHtml}
`;
}).join("")
: `
<tr>
<td colspan="7" class="empty">
No customers found matching "${esc(q)}".
</td>
</tr>
`;
}


function viewOrder(id){

const order =
orders.find(
x=>String(x.id)===String(id)
);

if(!order)return;

const c=customer(order);
const its=items(order);


document.getElementById("modalTitle")
.textContent =
order.order_number ||
order.order_no ||
order.id;


document.getElementById("modalBody")
.innerHTML=`

<div class="grid">

<div class="detail">
<span>Customer</span>
${esc(c.name)}
</div>

<div class="detail">
<span>Status</span>
${esc(order.status)}
</div>

<div class="detail">
<span>Phone</span>
${esc(c.phone)}
</div>

<div class="detail">
<span>Email</span>
${esc(c.email)}
</div>

<div class="detail">
<span>City</span>
${esc(c.city)}
</div>

<div class="detail">
<span>Payment</span>
${esc(order.payment_method)}
</div>

<div class="detail" style="grid-column:1/-1">
<span>Address</span>
${esc(c.address)}
</div>

</div>

<div style="margin-top:18px">

${its.map(item=>`

<div class="item">

<span>
${esc(item.product_name || item.name || "Product")}
×
${Number(item.quantity || item.qty || 0)}
</span>

<b>
${money(
Number(item.unit_price || item.price || 0) *
Number(item.quantity || item.qty || 0)
)}
</b>

</div>

`).join("")}

</div>

<div class="total">
<span>Total</span>
<b>${money(order.total)}</b>
</div>

`;


document.getElementById("modal")
.classList.add("open");

}


document.getElementById("loginForm")
.addEventListener("submit",e=>{

e.preventDefault();
login();

});


document.getElementById("logoutBtn")
.addEventListener("click",logout);


document.getElementById("search")
.addEventListener("input",renderOrders);


document.getElementById("filter")
.addEventListener("change",renderOrders);

document.getElementById("customerSearch")
?.addEventListener("input",renderCustomers);

window.toggleCustomerExpand = toggleCustomerExpand;


document.getElementById("closeModal")
.addEventListener("click",()=>{

document.getElementById("modal")
.classList.remove("open");

});


document.getElementById("modal")
.addEventListener("click",e=>{

if(e.target.id==="modal"){
e.currentTarget.classList.remove("open");
}

});


document.querySelectorAll(".tab")
.forEach(button=>{

button.addEventListener("click",()=>{

document.querySelectorAll(".tab")
.forEach(x=>x.classList.remove("active"));

button.classList.add("active");

const tab=button.dataset.tab;

document.getElementById("ordersSection")
.style.display=
tab==="orders"?"block":"none";

document.getElementById("customersSection")
.style.display=
tab==="customers"?"block":"none";

document.getElementById("productsSection")
.style.display=
tab==="products"?"block":"none";

});

});


document.addEventListener("DOMContentLoaded", async()=>{

try{

const result =
await db.auth.getSession();

if(result.data.session){

const admin =
await isCurrentUserAdmin();

if(admin){

document.getElementById("login")
.style.display="none";

document.getElementById("app")
.style.display="block";

await load();

}else{

await db.auth.signOut();

}

}

}catch(error){

console.error(error);

}

});

