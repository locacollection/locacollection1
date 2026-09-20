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
let orderItems=[];
let products=[];


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
productsResult
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
.order("id")

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


function renderCustomers(){

const map={};

orders.forEach(order=>{

const c=customer(order);

const key =
c.id ||
c.email ||
c.phone ||
c.name;

if(!map[key]){

map[key]={
...c,
orders:0,
spent:0
};

}

map[key].orders++;

if(order.status!=="Cancelled"){

map[key].spent +=
Number(order.total||0);

}

});


const list=Object.values(map);


document.getElementById("customersBody")
.innerHTML=list.length

? list.map(c=>`

<tr>

<td><b>${esc(c.name)}</b></td>
<td>${esc(c.phone)}</td>
<td>${esc(c.email)}</td>
<td>${esc(c.city)}</td>
<td>${c.orders}</td>
<td><b>${money(c.spent)}</b></td>

</tr>

`).join("")

:`

<tr>
<td colspan="6" class="empty">
No customers yet.
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

