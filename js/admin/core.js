document.getElementById("login")?.style.setProperty("display","none");
document.querySelector('.store-link[href="index.html"]')?.removeAttribute('target');
const requestedProductId=new URLSearchParams(window.location.search).get('editProduct');if(requestedProductId){const editTimer=setInterval(()=>{const editButton=document.querySelector(`[data-edit="${CSS.escape(requestedProductId)}"]`);if(editButton){document.querySelector('.tab[data-tab="products"]')?.click();editButton.click();clearInterval(editTimer)}},100);setTimeout(()=>clearInterval(editTimer),10000)}
const SUPABASE_URL=(window.LOCA&&window.LOCA.SUPABASE_URL)||"https://qvvrjogeqranowfseivh.supabase.co";
const SUPABASE_KEY=(window.LOCA&&window.LOCA.SUPABASE_KEY)||"sb_publishable_IP9PzAVXsVwcqNWenmdmLg_ACtzSDMB";
const db=(window.LOCA&&window.LOCA.db)||supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
import("../admin-guard.js").catch(error=>console.warn("Admin route guard could not start:",error));
let orders=[],customers=[],profiles=[],orderItems=[],products=[],orderActions=[];let activeCustomer=null,customerLoadError=null;
const money=value=>"PKR "+Number(value||0).toLocaleString("en-PK");
const esc=value=>String(value??"").replace(/[&<>\"]/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[x]));
const ORDER_STATUSES=["Pending","Confirmed","Processing","Packed","Shipped","Out for Delivery","Delivered","Return Requested","Returned","Cancelled"];
const PAYMENT_STATUSES=["Unpaid","Payment Pending","Partially Paid","Paid","Refund Pending","Failed","Refunded"];
const workflowSlug=value=>String(value||"unknown").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function orderStatusBadge(value){const label=value||"Pending";return `<span class="status-chip order-${workflowSlug(label)}">${esc(label)}</span>`;}
function paymentStatusBadge(value){const label=value||"Unpaid";return `<span class="status-chip payment-${workflowSlug(label)}">${esc(label)}</span>`;}
function adminNotify(message,{title="Studio update",tone="success",duration=4200}={}){const region=document.getElementById("adminToastRegion");if(!region)return;const toast=document.createElement("div");toast.className="admin-toast"+(tone==="error"?" is-error":"");const copy=document.createElement("div"),heading=document.createElement("b"),body=document.createElement("span"),close=document.createElement("button");heading.textContent=title;body.textContent=message;close.type="button";close.setAttribute("aria-label","Dismiss message");close.textContent="×";copy.append(heading,body);toast.append(copy,close);const remove=()=>{toast.style.opacity="0";toast.style.transform="translateX(18px)";setTimeout(()=>toast.remove(),220)};close.addEventListener("click",remove);region.appendChild(toast);setTimeout(remove,duration);}
function confirmAction({eyebrow="Please confirm",title="Continue?",message="",confirmLabel="Continue"}={}){const dialog=document.getElementById("adminConfirmDialog");if(!dialog)return Promise.resolve(false);if(dialog.open)dialog.close("cancel");document.getElementById("adminConfirmEyebrow").textContent=eyebrow;document.getElementById("adminConfirmTitle").textContent=title;document.getElementById("adminConfirmMessage").textContent=message;document.getElementById("adminConfirmButton").textContent=confirmLabel;dialog.returnValue="cancel";return new Promise(resolve=>{const cancel=document.getElementById("adminConfirmCancel"),confirm=document.getElementById("adminConfirmButton");cancel.onclick=()=>dialog.close("cancel");confirm.onclick=()=>dialog.close("confirm");dialog.addEventListener("cancel",event=>{event.preventDefault();dialog.close("cancel")},{once:true});dialog.addEventListener("close",()=>resolve(dialog.returnValue==="confirm"),{once:true});dialog.showModal();setTimeout(()=>cancel.focus(),30);});}
async function isCurrentUserAdmin(){const {data:{user},error}=await db.auth.getUser();if(error||!user)return false;const result=await db.rpc("is_admin");if(result.error)throw result.error;return result.data===true;}
async function login(){const email=document.getElementById("adminEmail").value.trim();const password=document.getElementById("adminPass").value;const box=document.getElementById("loginError");box.textContent="Signing in...";try{const result=await db.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(!result.data.session)throw new Error("Login session was not created.");if(!await isCurrentUserAdmin()){await db.auth.signOut();throw new Error("This account is not authorized as an admin.");}document.getElementById("login").style.display="none";document.getElementById("app").style.display="block";await load();}catch(error){box.textContent=error.message||"Sign in failed.";}}
async function logout(){await db.auth.signOut();location.reload();}
async function load(){
  const[or,cr,ir,pr,fr,ar]=await Promise.all([
    db.from("orders").select("*").order("created_at",{ascending:false}),
    db.from("customers").select("*"),
    db.from("order_items").select("*"),
    db.from("products").select("*").order("id"),
    db.from("profiles").select("*"),
    db.from("order_customer_actions").select("*").order("created_at",{ascending:false})
  ]);
  orders=or.error?[]:or.data||[];
  customerLoadError=cr.error||null;
  customers=cr.error?[]:cr.data||[];
  orderItems=ir.error?[]:ir.data||[];
  products=pr.error?[]:pr.data||[];
  profiles=fr.error?[]:(fr.data||[]).filter(profile=>profile.role==='customer');
  orderActions=ar.error?[]:ar.data||[];
  renderStats();
  renderOrders();
  renderCustomers();
  renderProducts();
  window.loadArchivedOrders?.({quiet:true});
  window.loadAdminReviews?.({quiet:true});
  document.getElementById("headDate").textContent=new Date().toLocaleDateString("en-PK",{weekday:"long",day:"numeric",month:"long"});
  const failures=[or,cr,ir,pr,fr,ar].filter(x=>x.error);
  if(failures.length){
    console.warn("Some dashboard data could not be loaded",failures.map(x=>x.error.message));
    const sync=document.getElementById("topSyncLabel");
    if(sync)sync.textContent=pr.error?"Catalogue needs retry":"Partially synced";
    const msg=document.getElementById("catalogMessage");
    if(msg&&pr.error){
      msg.textContent="Catalogue could not be loaded: "+pr.error.message;
      msg.classList.add("error");
    }
    if(cr.error)adminNotify("Customer records could not be loaded. Orders are still visible, but the Studio will not label them as guests.",{title:"Customer details unavailable",tone:"error",duration:6500});
  }
}
function customer(order){const record=customers.find(x=>String(x.id)===String(order.customer_id));if(record)return record;const profile=profiles.find(x=>String(x.id)===String(order.user_id));if(profile)return{id:order.customer_id,user_id:order.user_id,name:profile.full_name||"",email:profile.contact_email||profile.email||"",phone:profile.phone||"",address:profile.address||"",city:profile.city||"",_source:"profile"};return{id:order.customer_id,user_id:order.user_id||null,_missing:true};}
function customerName(value){return value?.name||(customerLoadError?"Customer details unavailable":"Unnamed customer");}
function customerEmail(value){return value?.email||(customerLoadError?"Customer data unavailable":"Not provided");}
function items(order){return orderItems.filter(x=>String(x.order_id)===String(order.id));}
function latestCustomerAction(orderId){
  return orderActions.find(action=>String(action.order_id)===String(orderId))||null;
}
function customerActionTimeline(orderId){
  const list=orderActions.filter(action=>String(action.order_id)===String(orderId));
  if(!list.length)return "";
  return `<div class="customer-action-timeline"><p class="kicker">Customer activity</p>${list.map(action=>`<div class="customer-action-entry"><div><strong>${esc(action.action_type)}</strong><span>${new Date(action.created_at).toLocaleString("en-PK")}</span></div><div>${action.reason?`<b>${esc(action.reason)}</b>`:""}${action.note?`<p>${esc(action.note)}</p>`:""}</div></div>`).join("")}</div>`;
}
function renderStats(){const awaiting=orders.filter(x=>!["Delivered","Cancelled","Returned"].includes(x.status)).length;const delivered=orders.filter(x=>x.status==="Delivered").length;const revenue=orders.filter(x=>x.payment_status==="Paid"&&!["Cancelled","Returned"].includes(x.status)).reduce((sum,x)=>sum+Number(x.total||0),0);document.getElementById("stats").innerHTML=`<div class="stat"><span>Total orders</span><b>${orders.length}</b></div><div class="stat"><span>In progress</span><b>${awaiting}</b></div><div class="stat"><span>Delivered</span><b>${delivered}</b></div><div class="stat"><span>Paid revenue</span><b>${money(revenue)}</b></div>`;document.getElementById("sideOrderCount").textContent=orders.length;document.getElementById("sideProductCount").textContent=products.length;const userCount=document.getElementById("sideUserCount");if(userCount)userCount.textContent=profiles.length;}
function renderOrders(){
  const query=document.getElementById("search").value.toLowerCase();
  const status=document.getElementById("filter").value;
  const payment=document.getElementById("paymentFilter")?.value||"All";
  const list=orders.filter(order=>{
    const c=customer(order);
    const action=latestCustomerAction(order.id);
    const text=`${order.order_number||order.order_no||order.id} ${c.name||""} ${c.phone||""} ${c.email||""} ${order.status||""} ${order.payment_status||"Unpaid"} ${order.cancellation_reason||""} ${action?.action_type||""} ${action?.reason||""} ${action?.note||""}`.toLowerCase();
    return(status==="All"||order.status===status)&&(payment==="All"||order.payment_status===payment)&&text.includes(query);
  });
  document.getElementById("orderCount").textContent=`${list.length} shown · ${orders.length} total`;
  document.getElementById("ordersBody").innerHTML=list.length?list.map(order=>{
    const c=customer(order);
    const its=items(order);
    const count=its.reduce((sum,item)=>sum+Number(item.quantity||item.qty||0),0);
    const action=latestCustomerAction(order.id);
    const cancelNote=order.status==="Cancelled"&&order.cancellation_reason?`<small class="workflow-reason">${esc(order.cancelled_by||"Admin")} · ${esc(order.cancellation_reason)}</small>`:"";
    const actionNote=action?`<small class="workflow-reason customer-action-flag">Customer · ${esc(action.action_type)}${action.reason?" · "+esc(action.reason):""}</small>`:"";
    return `<tr><td><b>${esc(order.order_number||order.order_no||order.id)}</b><br><span class="muted">${new Date(order.created_at).toLocaleString("en-PK")}</span></td><td><b>${esc(customerName(c))}</b><br><span class="muted">${esc(c.city||c.email||(customerLoadError?"Customer data unavailable":""))}</span><br>${esc(c.phone||"")}</td><td>${count}</td><td><b>${money(order.total)}</b></td><td>${esc(order.payment_method||"COD")}</td><td><div class="workflow-cell">${orderStatusBadge(order.status)}${paymentStatusBadge(order.payment_status)}${cancelNote}${actionNote}</div></td><td><div class="row-actions"><button class="smallbtn workflow-button" onclick="openOrderWorkflow('${order.id}')">Manage</button><button class="smallbtn" onclick="viewOrder('${order.id}')">Inspect</button><button class="smallbtn danger-action" onclick="openArchiveOrder('${order.id}')">Archive</button></div></td></tr>`;
  }).join(""):`<tr><td colspan="7" class="empty">No orders match this view.</td></tr>`;
}
function toggleWorkflowCancellation(){const cancelled=document.getElementById("workflowStatus")?.value==="Cancelled",section=document.getElementById("workflowCancellationFields");if(section)section.hidden=!cancelled;if(cancelled&&!document.getElementById("workflowCancelledBy").value)document.getElementById("workflowCancelledBy").value="Admin";}
function closeOrderWorkflow(){const dialog=document.getElementById("orderWorkflowDialog");if(dialog?.open)dialog.close();}
function openOrderWorkflow(id){
  const order=orders.find(entry=>String(entry.id)===String(id));
  if(!order)return;
  document.getElementById("modal")?.classList.remove("open");
  const c=customer(order);
  const action=latestCustomerAction(order.id);
  const dialog=document.getElementById("orderWorkflowDialog");
  dialog.dataset.orderId=String(order.id);
  document.getElementById("workflowTitle").textContent=order.order_number||order.order_no||order.id;
  document.getElementById("workflowMeta").textContent=`${customerName(c)} · ${c.phone||c.email||(customerLoadError?"Customer data unavailable":"No contact")}`;
  document.getElementById("workflowStatus").value=ORDER_STATUSES.includes(order.status)?order.status:"Pending";
  document.getElementById("workflowPayment").value=PAYMENT_STATUSES.includes(order.payment_status)?order.payment_status:"Unpaid";
  document.getElementById("workflowCancelledBy").value=order.cancelled_by||"";
  document.getElementById("workflowCancelReason").value=order.cancellation_reason||"";
  document.getElementById("workflowCancelNote").value=order.cancellation_note||"";
  const actionHtml=action?`<div class="workflow-customer-action"><small>Latest customer action</small><strong>${esc(action.action_type)}</strong><span>${action.reason?esc(action.reason):new Date(action.created_at).toLocaleString("en-PK")}</span>${action.note?`<p>${esc(action.note)}</p>`:""}</div>`:"";
  document.getElementById("workflowSnapshot").innerHTML=`<div><small>Current workflow</small><div class="workflow-badges">${orderStatusBadge(order.status)}${paymentStatusBadge(order.payment_status)}</div></div><div><small>Order value</small><strong>${money(order.total)}</strong><span>${esc(order.payment_method||"Cash on Delivery")}</span></div>${actionHtml}`;
  const message=document.getElementById("workflowMessage");
  message.textContent="";
  message.className="";
  toggleWorkflowCancellation();
  dialog.showModal();
  setTimeout(()=>document.getElementById("workflowStatus")?.focus(),40);
}
async function saveOrderWorkflow(event){event.preventDefault();const dialog=document.getElementById("orderWorkflowDialog"),id=dialog.dataset.orderId,order=orders.find(entry=>String(entry.id)===String(id));if(!order)return;const status=document.getElementById("workflowStatus").value,payment_status=document.getElementById("workflowPayment").value,cancelled=status==="Cancelled",cancelled_by=cancelled?document.getElementById("workflowCancelledBy").value:null,cancellation_reason=cancelled?document.getElementById("workflowCancelReason").value:null,cancellation_note=cancelled?(document.getElementById("workflowCancelNote").value.trim()||null):null,message=document.getElementById("workflowMessage"),button=document.getElementById("saveOrderWorkflow");if(cancelled&&(!cancelled_by||!cancellation_reason)){message.textContent="Choose who cancelled the order and the cancellation reason.";message.className="error";return;}button.disabled=true;button.textContent="Saving…";message.textContent="Updating fulfilment and payment details…";message.className="";try{if(!await isCurrentUserAdmin())throw new Error("Your admin session has expired.");const payload={status,payment_status,cancelled_by,cancellation_reason,cancellation_note},{data,error}=await db.from("orders").update(payload).eq("id",id).select("*").single();if(error)throw error;const index=orders.findIndex(entry=>String(entry.id)===String(id));if(index>=0)orders[index]=data;renderStats();renderOrders();renderCustomers();closeOrderWorkflow();adminNotify(`${data.order_number||"Order"} · ${data.status} · ${data.payment_status}`,{title:"Workflow updated"});}catch(error){message.textContent=error.message||"Order workflow could not be saved.";message.className="error";adminNotify(message.textContent,{title:"Workflow not updated",tone:"error",duration:6000});}finally{button.disabled=false;button.textContent="Save workflow";}}
function changeStatus(id,status){openOrderWorkflow(id);const select=document.getElementById("workflowStatus");if(select&&ORDER_STATUSES.includes(status)){select.value=status;toggleWorkflowCancellation();}}
function customerDirectory(){const map={};const add=(entry,registered=false)=>{const email=(entry.email||"").trim().toLowerCase();const key=email||String(entry.user_id||entry.id||entry.phone||entry.name||Math.random());if(!map[key])map[key]={...entry,is_registered:registered,orders:0,spent:0};else{map[key].is_registered=map[key].is_registered||registered;["name","phone","city","address","user_id"].forEach(k=>{if(!map[key][k]&&entry[k])map[key][k]=entry[k];});}return map[key];};profiles.forEach(p=>add({id:p.id,user_id:p.id,name:p.full_name||p.name||p.email?.split("@")[0],email:p.email||"",phone:p.phone||"",city:p.city||"",address:p.address||""},true));customers.forEach(c=>add({...c,user_id:c.user_id||c.id},false));orders.forEach(o=>{const c=customer(o);const entry=add({...c,email:c.email||o.email||"",name:c.name||o.name||customerName(c),phone:c.phone||o.phone||"",city:c.city||o.city||"",address:c.address||o.address||"",user_id:o.user_id||c.user_id},false);entry._ordersList=entry._ordersList||[];if(!entry._ordersList.some(x=>String(x.id)===String(o.id)))entry._ordersList.push(o);});Object.values(map).forEach(c=>{const matches=orders.filter(o=>{const oc=customer(o);return(c.user_id&&o.user_id&&String(c.user_id)===String(o.user_id))||(c.email&&((oc.email||o.email||"").toLowerCase()===c.email.toLowerCase()))||(c.phone&&((oc.phone||o.phone||"")===c.phone));});c._ordersList=matches;c.orders=matches.length;c.spent=matches.filter(o=>!["Cancelled","Returned"].includes(o.status)).reduce((s,o)=>s+Number(o.total||0),0);});return map;}
function renderCustomers(){const map=customerDirectory();const q=(document.getElementById("customerSearch")?.value||"").trim().toLowerCase();let list=Object.values(map).filter(c=>!q||`${c.name} ${c.email} ${c.phone} ${c.city}`.toLowerCase().includes(q));document.getElementById("customerCount").textContent=customerLoadError?"Customer records are temporarily unavailable. Refresh to retry.":`${list.length} unique profile${list.length===1?"":"s"} · deduplicated by email`;document.getElementById("sideCustomerCount").textContent=list.length;document.getElementById("customersBody").innerHTML=customerLoadError?`<tr><td colspan="7" class="empty">Customer details could not be loaded: ${esc(customerLoadError.message||"Permission or connection error")}</td></tr>`:list.length?list.map((c,i)=>{const key=encodeURIComponent(String(c.email||c.user_id||c.id||i));return `<tr><td><b>${esc(customerName(c))}</b>${c.is_registered?`<span class="status Confirmed" style="margin-left:6px">Registered</span>`:`<span class="muted" style="margin-left:6px">Order-only record</span>`}</td><td>${esc(c.phone||"—")}</td><td>${esc(c.email||"—")}</td><td>${esc(c.city||"—")}</td><td><b>${c.orders}</b></td><td><b>${money(c.spent)}</b></td><td><button class="smallbtn" data-profile-key="${key}">Open profile ↗</button></td></tr>`;}).join(""):`<tr><td colspan="7" class="empty">No customers found.</td></tr>`;window.__customerDirectory=map;}
async function openCustomerProfile(encoded){
  const key=decodeURIComponent(encoded);
  const c=window.__customerDirectory?.[key]||Object.values(window.__customerDirectory||{}).find(x=>(x.email||x.user_id||x.id)===key);
  if(!c)return;
  activeCustomer=c;
  const title=document.getElementById("profileDrawerTitle");
  const email=document.getElementById("profileDrawerEmail");
  const body=document.getElementById("profileDrawerBody");
  title.textContent=customerName(c);
  email.textContent=c.email||"No account email";

  const orderHtml=c._ordersList?.length?c._ordersList.map(o=>`<div class="drawer-order"><div><strong>${esc(o.order_number||o.order_no||o.id)}</strong><span>${new Date(o.created_at).toLocaleDateString("en-PK")}</span><div class="mini-status-row">${orderStatusBadge(o.status)}${paymentStatusBadge(o.payment_status)}</div></div><div><b>${money(o.total)}</b><br><button class="smallbtn" onclick="viewOrder('${o.id}')">Inspect</button></div></div>`).join(""):"<p class=\"muted\">No orders yet.</p>";

  const renderBody=(addresses=[],addressError="")=>{
    let addressHtml="";
    if(addressError){
      addressHtml=`<div class="profile-address address-load-error"><b>Could not load synced addresses</b><br>${esc(addressError)}</div>`;
    }else if(addresses.length){
      addressHtml=addresses.map(a=>`<div class="profile-address"><div class="profile-address-head"><b>${esc(a.label||"Saved address")}</b>${a.is_default?'<span class="status Confirmed">Default</span>':""}</div>${esc(a.recipient_name||c.name||"Customer")} · ${esc(a.phone||c.phone||"No phone")}<br>${esc(a.address||"")}, ${esc(a.city||c.city||"Pakistan")}</div>`).join("");
    }else if(c.address){
      addressHtml=`<div class="profile-address"><b>Latest order address</b><br>${esc(c.address)}, ${esc(c.city||"Pakistan")}<br>${esc(c.phone||"")}</div>`;
    }else{
      addressHtml='<p class="muted">No saved delivery address.</p>';
    }
    body.innerHTML=`<div class="profile-block"><h3>Account snapshot</h3><div class="profile-facts"><div class="profile-fact"><small>Email</small><strong>${esc(c.email||(customerLoadError?"Customer data unavailable":"Not provided"))}</strong></div><div class="profile-fact"><small>Phone</small><strong>${esc(c.phone||(customerLoadError?"Customer data unavailable":"Not provided"))}</strong></div><div class="profile-fact"><small>City</small><strong>${esc(c.city||(customerLoadError?"Customer data unavailable":"Not provided"))}</strong></div><div class="profile-fact"><small>Total spent</small><strong>${money(c.spent)}</strong></div></div></div><div class="profile-block"><h3>Order history · ${c.orders}</h3>${orderHtml}</div><div class="profile-block"><h3>Delivery addresses</h3>${addressHtml}</div>`;
  };

  renderBody([],"");
  document.getElementById("customerProfileDrawer").classList.add("open");
  document.getElementById("customerProfileDrawer").setAttribute("aria-hidden","false");
  document.getElementById("profileDrawerBackdrop").classList.add("open");

  if(!c.user_id)return;
  const{data,error}=await db.from("delivery_addresses").select("*").eq("user_id",c.user_id).order("is_default",{ascending:false}).order("created_at",{ascending:true});
  if(activeCustomer!==c)return;
  renderBody(data||[],error?error.message:"");
}
function closeCustomerProfile(){document.getElementById("customerProfileDrawer").classList.remove("open");document.getElementById("customerProfileDrawer").setAttribute("aria-hidden","true");document.getElementById("profileDrawerBackdrop").classList.remove("open");}
function viewOrder(id){
  const order=orders.find(x=>String(x.id)===String(id));
  if(!order)return;
  const c=customer(order);
  const its=items(order);
  const cancelled=order.status==="Cancelled"?`<div class="cancellation-detail"><p class="kicker">Cancellation</p><div class="grid"><div class="detail"><span>Cancelled by</span>${esc(order.cancelled_by||"Not recorded")}</div><div class="detail"><span>Reason</span>${esc(order.cancellation_reason||"Not recorded")}</div>${order.cancellation_note?`<div class="detail" style="grid-column:1/-1"><span>Internal note</span>${esc(order.cancellation_note)}</div>`:""}</div></div>`:"";
  document.getElementById("modalTitle").textContent=order.order_number||order.order_no||order.id;
  document.getElementById("modalBody").innerHTML=`<div class="order-detail-workflow"><div><small>Fulfilment</small>${orderStatusBadge(order.status)}</div><div><small>Payment</small>${paymentStatusBadge(order.payment_status)}</div><div class="order-detail-actions"><button class="smallbtn workflow-button" onclick="openOrderWorkflow('${order.id}')">Manage workflow</button><button class="smallbtn danger-action" onclick="openArchiveOrder('${order.id}')">Archive order</button></div></div><div class="grid"><div class="detail"><span>Customer</span>${esc(customerName(c))}</div><div class="detail"><span>Phone</span>${esc(c.phone||order.phone||(customerLoadError?"Customer data unavailable":"Not provided"))}</div><div class="detail"><span>Email</span>${esc(c.email||order.email||customerEmail(c))}</div><div class="detail"><span>City</span>${esc(c.city||order.city||(customerLoadError?"Customer data unavailable":"Not provided"))}</div><div class="detail"><span>Payment method</span>${esc(order.payment_method||"COD")}</div><div class="detail"><span>Last workflow update</span>${new Date(order.status_updated_at||order.created_at).toLocaleString("en-PK")}</div><div class="detail" style="grid-column:1/-1"><span>Address</span>${esc(c.address||order.address||(customerLoadError?"Customer data unavailable":"Not provided"))}</div></div>${cancelled}${customerActionTimeline(order.id)}<div class="order-line-items">${its.map(item=>`<div class="item"><span>${esc(item.product_name||item.name||"Product")} × ${Number(item.quantity||item.qty||0)}</span><b>${money(Number(item.unit_price||item.price||0)*Number(item.quantity||item.qty||0))}</b></div>`).join("")}</div><div class="total"><span>Total</span><b>${money(order.total)}</b></div>`;
  document.getElementById("modal").classList.add("open");
}

document.getElementById("orderWorkflowForm").addEventListener("submit",saveOrderWorkflow);document.getElementById("workflowStatus").addEventListener("change",toggleWorkflowCancellation);["closeOrderWorkflow","cancelOrderWorkflow"].forEach(id=>document.getElementById(id).addEventListener("click",closeOrderWorkflow));document.getElementById("orderWorkflowDialog").addEventListener("cancel",event=>{event.preventDefault();closeOrderWorkflow();});
document.getElementById("loginForm").addEventListener("submit",e=>{e.preventDefault();login();});document.getElementById("logoutBtn").addEventListener("click",logout);document.getElementById("search").addEventListener("input",renderOrders);document.getElementById("filter").addEventListener("change",renderOrders);document.getElementById("paymentFilter")?.addEventListener("change",renderOrders);document.getElementById("customerSearch")?.addEventListener("input",renderCustomers);document.getElementById("customersBody").addEventListener("click",e=>{const button=e.target.closest("[data-profile-key]");if(button)openCustomerProfile(button.dataset.profileKey);});document.getElementById("closeProfileDrawer").addEventListener("click",closeCustomerProfile);document.getElementById("profileDrawerBackdrop").addEventListener("click",closeCustomerProfile);document.getElementById("closeModal").addEventListener("click",()=>document.getElementById("modal").classList.remove("open"));document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal")e.currentTarget.classList.remove("open")});document.querySelectorAll(".tab").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));button.classList.add("active");const tab=button.dataset.tab;document.getElementById("ordersSection").style.display=tab==="orders"?"block":"none";document.getElementById("customersSection").style.display=tab==="customers"?"block":"none";document.getElementById("usersSection").style.display=tab==="users"?"block":"none";document.getElementById("productsSection").style.display=tab==="products"?"block":"none";document.getElementById("pageTitle").textContent=tab==="orders"?"Good evening, let’s ship beautifully.":tab==="customers"?"Know who is behind every order.":tab==="users"?"Registered LOCA accounts.":"Shape the next LOCA edit.";}));document.addEventListener("DOMContentLoaded",async()=>{try{const result=await db.auth.getSession();if(result.data.session&&await isCurrentUserAdmin()){document.getElementById("login").style.display="none";document.getElementById("app").style.display="block";await load();}else if(result.data.session)await db.auth.signOut();}catch(error){console.error(error);}});window.adminNotify=adminNotify;window.confirmAction=confirmAction;window.orderStatusBadge=orderStatusBadge;window.paymentStatusBadge=paymentStatusBadge;window.openOrderWorkflow=openOrderWorkflow;window.closeOrderWorkflow=closeOrderWorkflow;window.viewOrder=viewOrder;window.changeStatus=changeStatus;window.openCustomerProfile=openCustomerProfile;window.closeCustomerProfile=closeCustomerProfile;
