window.LOCA=window.LOCA||{};
LOCA.addresses=LOCA.addresses||[];
let addressLoadPromise=null,myOrdersCache=[],myOrderActions=[],activeOrderFilter='All';

function cartEntries(){return Object.entries(LOCA.cart||{}).filter(([,quantity])=>Number(quantity)>0)}
function cartTotal(){return cartEntries().reduce((sum,[id,quantity])=>{const product=LOCA.products.find(item=>String(item.id)===String(id));return sum+(product?product.price*quantity:0)},0)}
function legacyAddressKey(){return LOCA.currentUser?'loca_addresses_'+LOCA.currentUser.id:'loca_addresses_guest'}
function readLegacyAddresses(){try{return JSON.parse(localStorage.getItem(legacyAddressKey())||'[]')}catch{return[]}}
function addressLabel(address){return [address.address,address.city].filter(Boolean).join(', ')}
function statusSlug(value){return String(value||'Pending').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function storefrontStatusBadge(value,type='order'){const label=value||(type==='payment'?'Unpaid':'Pending');return `<span class="account-status ${type}-${statusSlug(label)}">${LOCA.escape(label)}</span>`}
function activeOrder(order){return !['Delivered','Cancelled','Returned'].includes(order.status)}
function latestOrderAction(orderId){
  return myOrderActions.find(action=>String(action.order_id)===String(orderId))||null;
}
function orderProgress(order){
  const steps=['Pending','Confirmed','Processing','Packed','Shipped','Out for Delivery','Delivered'];
  const index=Math.max(0,steps.indexOf(order.status));
  const percent=order.status==='Delivered'?100:Math.round(index/(steps.length-1)*100);
  const action=latestOrderAction(order.id);
  if(order.status==='Cancelled')return `<div class="order-exception is-cancelled"><b>Cancelled by ${LOCA.escape((order.cancelled_by||'LOCA').toLowerCase())}</b><span>${LOCA.escape(order.cancellation_reason||'Cancellation details pending')}</span></div>`;
  if(order.status==='Return Requested')return `<div class="order-exception is-return-requested"><b>Return request received</b><span>${LOCA.escape(action?.reason||'Our team will review your request shortly.')}</span></div>`;
  if(order.status==='Returned')return '<div class="order-exception is-returned"><b>Return recorded</b><span>Our team will contact you with the next step.</span></div>';
  return `<div class="order-progress"><div class="order-progress-track"><i style="width:${percent}%"></i></div><div><span>Order placed</span><span>${order.status==='Delivered'?'Delivered':LOCA.escape(order.status||'Pending')}</span></div></div>`;
}

async function seedDeliveryAddresses(){if(!LOCA.currentUser)return[];const profile=LOCA.profile||{},legacy=readLegacyAddresses(),candidates=[];if(profile.address)candidates.push({label:'Home',recipient_name:profile.full_name||'',phone:profile.phone||'',address:profile.address,city:profile.city||'',is_default:true});legacy.forEach((item,index)=>{if(!item?.address||candidates.some(entry=>entry.address===item.address&&entry.city===(item.city||'')))return;candidates.push({label:item.title||`Saved address ${index+1}`,recipient_name:item.name||profile.full_name||'',phone:item.phone||profile.phone||'',address:item.address,city:item.city||profile.city||'',is_default:candidates.length===0})});if(!candidates.length)return[];const payload=candidates.slice(0,8).map((item,index)=>({...item,user_id:LOCA.currentUser.id,is_default:index===0})),{data,error}=await LOCA.db.from('delivery_addresses').insert(payload).select('*');if(error)throw error;return data||[]}
async function loadDeliveryAddresses({seed=false}={}){if(!LOCA.currentUser)return[];if(addressLoadPromise)return addressLoadPromise;addressLoadPromise=(async()=>{const{data,error}=await LOCA.db.from('delivery_addresses').select('*').eq('user_id',LOCA.currentUser.id).order('is_default',{ascending:false}).order('created_at',{ascending:true});if(error)throw error;let rows=data||[];if(seed&&!rows.length)rows=await seedDeliveryAddresses();LOCA.addresses=rows;renderAccountAddresses();renderAddressOptions();return rows})();try{return await addressLoadPromise}catch(error){console.warn('Address book could not be loaded',error);LOCA.addresses=[];renderAccountAddresses(error.message);renderAddressOptions();return[]}finally{addressLoadPromise=null}}
function renderAddressOptions(){const select=document.getElementById('coSavedAddress');if(!select)return;const list=LOCA.addresses||[];select.innerHTML=list.length?list.map(address=>`<option value="${LOCA.escape(address.id)}">${address.is_default?'Default · ':''}${LOCA.escape(address.label||'Saved address')} · ${LOCA.escape(addressLabel(address))}</option>`).join(''):'<option value="">No saved address yet</option>';applySavedAddress()}
function applySavedAddress(){const id=document.getElementById('coSavedAddress')?.value,address=(LOCA.addresses||[]).find(item=>String(item.id)===String(id));if(!address)return;document.getElementById('coAddress').value=address.address||'';document.getElementById('coCity').value=address.city||'';if(address.phone)document.getElementById('coPhone').value=address.phone}
function toggleNewAddress(){const isNew=document.getElementById('checkoutAddressMode')?.value==='new';document.getElementById('savedAddressField')?.toggleAttribute('hidden',isNew);document.getElementById('newAddressFields')?.toggleAttribute('hidden',!isNew);if(!isNew)applySavedAddress();else syncNewAddress()}
function syncNewAddress(){if(document.getElementById('checkoutAddressMode')?.value==='new'){document.getElementById('coAddress').value=document.getElementById('coNewAddress').value.trim();document.getElementById('coCity').value=document.getElementById('coNewCity').value.trim()}}

function renderAccountAddresses(error=''){const box=document.getElementById('accountAddresses');if(!box)return;const rows=LOCA.addresses||[];if(error){box.innerHTML=`<div class="account-empty"><b>Address book unavailable</b><span>${LOCA.escape(error)}</span></div>`;return}box.innerHTML=rows.length?rows.map(address=>`<article class="saved-address-card ${address.is_default?'is-default':''}"><div class="saved-address-top"><div><span>${LOCA.escape(address.label||'Saved address')}</span>${address.is_default?'<b>Default</b>':''}</div><div class="address-card-actions"><button type="button" data-edit-address="${LOCA.escape(address.id)}">Edit</button>${address.is_default?'':`<button type="button" data-default-address="${LOCA.escape(address.id)}">Make default</button>`}<button class="danger-link" type="button" data-delete-address="${LOCA.escape(address.id)}">Delete</button></div></div><strong>${LOCA.escape(address.recipient_name||LOCA.profile?.full_name||'LOCA customer')}</strong><p>${LOCA.escape(address.address)}, ${LOCA.escape(address.city)}</p><small>${LOCA.escape(address.phone||LOCA.profile?.phone||'No phone saved')}</small></article>`).join(''):'<div class="account-empty"><b>No delivery addresses yet.</b><span>Add your first address below—it will be available at checkout on every signed-in device.</span></div>'}
function resetAddressForm(){document.getElementById('addressForm')?.reset();document.getElementById('addressId').value='';document.getElementById('addressRecipient').value=LOCA.profile?.full_name||'';document.getElementById('addressPhone').value=LOCA.profile?.phone||'';document.getElementById('addressDefault').checked=!(LOCA.addresses||[]).length;document.getElementById('cancelAddressEdit').hidden=true;document.getElementById('saveAddressButton').textContent='Save address'}
function editDeliveryAddress(id){const address=(LOCA.addresses||[]).find(item=>String(item.id)===String(id));if(!address)return;document.getElementById('addressId').value=address.id;document.getElementById('addressLabel').value=address.label||'';document.getElementById('addressRecipient').value=address.recipient_name||'';document.getElementById('addressPhone').value=address.phone||'';document.getElementById('addressCity').value=address.city||'';document.getElementById('addressText').value=address.address||'';document.getElementById('addressDefault').checked=!!address.is_default;document.getElementById('cancelAddressEdit').hidden=false;document.getElementById('saveAddressButton').textContent='Update address';document.getElementById('addressLabel').focus()}
async function updateProfileAddress(address){if(!address?.is_default)return;const update={address:address.address,city:address.city,updated_at:new Date().toISOString()};if(address.phone&&!LOCA.profile?.phone)update.phone=address.phone;const{data,error}=await LOCA.db.from('profiles').update(update).eq('id',LOCA.currentUser.id).select('*').single();if(!error&&data)LOCA.profile=data}
async function setDefaultAddress(id,{quiet=false}={}){const address=(LOCA.addresses||[]).find(item=>String(item.id)===String(id));if(!address)return;const clear=await LOCA.db.from('delivery_addresses').update({is_default:false}).eq('user_id',LOCA.currentUser.id).eq('is_default',true);if(clear.error)throw clear.error;const result=await LOCA.db.from('delivery_addresses').update({is_default:true}).eq('id',id).select('*').single();if(result.error)throw result.error;await updateProfileAddress(result.data);await loadDeliveryAddresses();if(!quiet)LOCA.notice({eyebrow:'Delivery addresses',title:'Default address updated.',message:`${result.data.label} will be selected first at checkout.`,tone:'success',action:'Done'})}
async function saveDeliveryAddress(event){event.preventDefault();const button=document.getElementById('saveAddressButton'),id=document.getElementById('addressId').value,payload={user_id:LOCA.currentUser.id,label:document.getElementById('addressLabel').value.trim(),recipient_name:document.getElementById('addressRecipient').value.trim()||null,phone:document.getElementById('addressPhone').value.trim()||null,address:document.getElementById('addressText').value.trim(),city:document.getElementById('addressCity').value.trim(),is_default:document.getElementById('addressDefault').checked||!(LOCA.addresses||[]).length};if(!payload.label||!payload.address||!payload.city){LOCA.notice({eyebrow:'Delivery address',title:'Complete the address.',message:'Add a label, complete address and city.',tone:'error',action:'Review address'});return}button.disabled=true;button.textContent='Saving…';try{if(payload.is_default){const clear=await LOCA.db.from('delivery_addresses').update({is_default:false}).eq('user_id',LOCA.currentUser.id).eq('is_default',true);if(clear.error)throw clear.error}const query=id?LOCA.db.from('delivery_addresses').update(payload).eq('id',id):LOCA.db.from('delivery_addresses').insert(payload),{data,error}=await query.select('*').single();if(error)throw error;await updateProfileAddress(data);await loadDeliveryAddresses();resetAddressForm();LOCA.notice({eyebrow:'Delivery address',title:id?'Address updated.':'Address saved.',message:`${data.label} is ready for your next checkout.`,tone:'success',action:'Done'})}catch(error){LOCA.notice({eyebrow:'Delivery address',title:'Address was not saved.',message:error.message||'Please try again.',tone:'error',action:'Review address'})}finally{button.disabled=false;button.textContent=id?'Update address':'Save address'}}
async function deleteDeliveryAddress(id){const address=(LOCA.addresses||[]).find(item=>String(item.id)===String(id));if(!address)return;const approved=await LOCA.ask({eyebrow:'Delivery address',title:`Delete ${address.label}?`,message:'This removes the saved address from your LOCA account. It will not affect previous orders.',confirm:'Delete address'});if(!approved)return;try{const{error}=await LOCA.db.from('delivery_addresses').delete().eq('id',id);if(error)throw error;const remaining=(LOCA.addresses||[]).filter(item=>String(item.id)!==String(id));LOCA.addresses=remaining;if(address.is_default&&remaining.length)await setDefaultAddress(remaining[0].id,{quiet:true});else await loadDeliveryAddresses();resetAddressForm();LOCA.notice({eyebrow:'Delivery address',title:'Address deleted.',message:'Your saved delivery book has been updated.',tone:'success',action:'Done'})}catch(error){LOCA.notice({eyebrow:'Delivery address',title:'Address was not deleted.',message:error.message||'Please try again.',tone:'error',action:'Close'})}}

async function openCheckout(){if(!cartEntries().length){LOCA.notice({eyebrow:'Your bag',title:'Your bag is empty.',message:'Add a piece from the collection before continuing to checkout.',action:'Browse the collection'});return}if(!LOCA.currentUser){openAuth('signup');LOCA.notice({eyebrow:'Checkout',title:'Sign in to continue.',message:'Create your LOCA account or sign in so your bag, delivery details and order history stay together.',action:'Continue to sign in'});return}await LOCA.ensureProfile();await loadDeliveryAddresses({seed:true});document.getElementById('drawer')?.classList.remove('open');document.getElementById('overlay')?.classList.remove('open');document.getElementById('coPhone').value=LOCA.profile?.phone||'';document.getElementById('coEmail').value=LOCA.profile?.contact_email||LOCA.currentUser.email||'';const hasSaved=(LOCA.addresses||[]).length>0;document.getElementById('checkoutAddressMode').value=hasSaved?'saved':'new';renderAddressOptions();toggleNewAddress();document.getElementById('coTotal').textContent=LOCA.money(cartTotal());document.getElementById('checkoutModal').classList.add('open');document.body.classList.add('lock');setTimeout(()=>document.getElementById(hasSaved?'coPhone':'coNewAddress')?.focus(),80)}
function closeCheckout(){document.getElementById('checkoutModal')?.classList.remove('open');if(!document.querySelector('.modal-layer.open,.bag-drawer.open,.site-notice-layer.open'))document.body.classList.remove('lock')}
async function saveCheckoutAddress(address,city,phone){const rows=LOCA.addresses||[],payload={user_id:LOCA.currentUser.id,label:`Saved address ${rows.length+1}`,recipient_name:LOCA.profile?.full_name||null,phone:phone||null,address,city,is_default:rows.length===0};const{data,error}=await LOCA.db.from('delivery_addresses').insert(payload).select('*').single();if(error)throw error;LOCA.addresses=[data,...rows];await updateProfileAddress(data);return data}
async function placeOrder(event){event.preventDefault();if(!LOCA.currentUser){closeCheckout();openAuth('signup');return}syncNewAddress();const address=document.getElementById('coAddress').value.trim(),city=document.getElementById('coCity').value.trim(),phone=document.getElementById('coPhone').value.trim(),email=document.getElementById('coEmail').value.trim();if(!address||!city){LOCA.notice({eyebrow:'Delivery details',title:'Your address is incomplete.',message:'Choose a saved address or add your delivery address and city before placing the order.',action:'Add delivery details'});return}const isNew=document.getElementById('checkoutAddressMode').value==='new',form=event.target,button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Placing order…';try{if(isNew&&document.getElementById('saveNewAddress').checked)await saveCheckoutAddress(address,city,phone);const items=cartEntries().map(([id,quantity])=>({product_id:Number(id),quantity:Number(quantity)}));const{data,error}=await LOCA.db.rpc('place_order',{p_name:LOCA.profile?.full_name||LOCA.currentUser.user_metadata?.full_name||LOCA.currentUser.email?.split('@')[0]||'LOCA customer',p_phone:phone,p_email:email,p_address:address,p_city:city,p_payment:document.getElementById('coPayment').value,p_items:items});if(error)throw error;const result=Array.isArray(data)?data[0]:data;await clearCart();closeCheckout();document.getElementById('drawer')?.classList.remove('open');document.getElementById('overlay')?.classList.remove('open');LOCA.notice({eyebrow:'Order received',title:'Your order is confirmed.',message:'Order '+(result?.order_number||'LOCA-ORDER')+' has been placed. Track fulfilment and payment anytime in My Orders.',tone:'success',action:'Continue shopping'});form.reset();document.getElementById('checkoutAddressMode').value='saved';renderAddressOptions()}catch(error){LOCA.notice({eyebrow:'Checkout update',title:'We could not place the order.',message:error.message||'Please review your details and try again.',tone:'error',action:'Return to checkout'})}finally{button.disabled=false;button.textContent='Place order ↗'}}

const CUSTOMER_ORDER_ACTIONS={"cancel":{"eyebrow":"Customer cancellation","title":"Cancel this order?","intro":"Online cancellation is available before your order is packed.","reasonLabel":"Why are you cancelling?","submit":"Cancel order","secondary":"Keep order","guidance":"The order will be cancelled immediately. If payment was received, the payment status will move to Refund Pending for the admin team.","options":[["Changed my mind","Changed my mind"],["Ordered by mistake","Ordered by mistake"],["Delivery taking too long","Delivery taking too long"],["Payment issue","Payment issue"],["Found another option","Found another option"],["Other","Other"]]},"request_return":{"eyebrow":"Return request","title":"Request a return","intro":"Returns can be requested within seven days of delivery.","reasonLabel":"Why would you like to return it?","submit":"Send return request","secondary":"Not now","guidance":"Your order will move to Return Requested. The LOCA team will review the reason before confirming the return.","options":[["Size or fit issue","Size or fit issue"],["Item arrived damaged","Item arrived damaged"],["Wrong item received","Wrong item received"],["Product not as expected","Product not as expected"],["Quality concern","Quality concern"],["Other","Other"]]}};

function isReturnEligible(order){
  if(order.status!=='Delivered')return false;
  const delivered=new Date(order.delivered_at||order.status_updated_at||order.created_at).getTime();
  return Number.isFinite(delivered)&&Date.now()-delivered<=7*24*60*60*1000;
}
function matchesOrderFilter(order){
  if(activeOrderFilter==='All')return true;
  if(activeOrderFilter==='Active')return activeOrder(order);
  if(activeOrderFilter==='Returns')return ['Return Requested','Returned'].includes(order.status);
  return order.status===activeOrderFilter;
}
function customerActionReceipt(order){
  const action=latestOrderAction(order.id);
  if(!action)return '';
  const detail=[action.reason,action.note].filter(Boolean).map(LOCA.escape).join(' · ');
  return `<div class="customer-action-receipt"><div><span>Customer activity</span><b>${LOCA.escape(action.action_type)}</b></div><div><small>${new Date(action.created_at).toLocaleString('en-PK')}</small>${detail?`<p>${detail}</p>`:''}</div></div>`;
}
function orderActionButtons(order){
  const id=LOCA.escape(order.id);
  const buttons=[];
  if(['Pending','Confirmed','Processing'].includes(order.status))buttons.push(`<button class="account-order-action is-danger" type="button" data-order-action="cancel" data-order-id="${id}">Cancel order</button>`);
  if(order.status==='Out for Delivery')buttons.push(`<button class="account-order-action is-positive" type="button" data-order-confirm-delivery="${id}">Confirm delivery</button>`);
  if(isReturnEligible(order))buttons.push(`<button class="account-order-action" type="button" data-order-action="request_return" data-order-id="${id}">Request return</button>`);
  buttons.push(`<button class="account-order-action is-secondary" type="button" data-reorder-order="${id}">Buy again</button>`);
  return `<div class="account-order-actions">${buttons.join('')}</div>`;
}
function renderMyOrders(){
  const box=document.getElementById('myOrders');
  if(!box)return;
  const list=myOrdersCache.filter(matchesOrderFilter);
  box.innerHTML=list.length?list.map(order=>`<article class="account-order-card"><div class="account-order-head"><div><small>${new Date(order.created_at).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}</small><strong>${LOCA.escape(order.order_number||order.id)}</strong></div><div><b>${LOCA.money(order.total)}</b><small>${LOCA.escape(order.payment_method||'Cash on Delivery')}</small></div></div><div class="account-order-status">${storefrontStatusBadge(order.status)}${storefrontStatusBadge(order.payment_status,'payment')}</div>${orderProgress(order)}${customerActionReceipt(order)}<div class="account-order-foot"><span>Last update</span><time>${new Date(order.status_updated_at||order.created_at).toLocaleString('en-PK')}</time></div>${orderActionButtons(order)}</article>`).join(''):`<div class="account-empty"><b>No ${activeOrderFilter==='All'?'':activeOrderFilter.toLowerCase()+' '}orders found.</b><span>Your orders will appear here with payment and delivery updates.</span></div>`;
}
async function loadMyOrders(){
  const box=document.getElementById('myOrders');
  if(!box||!LOCA.currentUser)return;
  box.innerHTML='<div class="account-loading">Loading your private order book…</div>';
  const[orderResult,actionResult]=await Promise.all([
    LOCA.db.from('orders').select('*').eq('user_id',LOCA.currentUser.id).order('created_at',{ascending:false}),
    LOCA.db.from('order_customer_actions').select('*').eq('user_id',LOCA.currentUser.id).order('created_at',{ascending:false})
  ]);
  if(orderResult.error){
    box.innerHTML=`<div class="account-empty"><b>Orders unavailable.</b><span>${LOCA.escape(orderResult.error.message)}</span></div>`;
    return;
  }
  myOrdersCache=orderResult.data||[];
  myOrderActions=actionResult.error?[]:actionResult.data||[];
  if(actionResult.error)console.warn('Customer order activity could not be loaded',actionResult.error);
  renderMyOrders();
}
function openOrderAction(orderId,actionName){
  const config=CUSTOMER_ORDER_ACTIONS[actionName];
  const order=myOrdersCache.find(item=>String(item.id)===String(orderId));
  const dialog=document.getElementById('orderActionDialog');
  if(!config||!order||!dialog)return;
  document.getElementById('orderActionOrderId').value=order.id;
  document.getElementById('orderActionType').value=actionName;
  document.getElementById('orderActionEyebrow').textContent=config.eyebrow;
  document.getElementById('orderActionTitle').textContent=config.title;
  document.getElementById('orderActionIntro').textContent=config.intro;
  document.getElementById('orderActionOrder').innerHTML=`<span>${LOCA.escape(order.order_number||order.id)}</span><strong>${LOCA.money(order.total)}</strong>${storefrontStatusBadge(order.status)}`;
  document.getElementById('orderActionReasonLabel').textContent=config.reasonLabel;
  document.getElementById('orderActionReason').innerHTML='<option value="">Choose a reason</option>'+config.options.map(([value,label])=>`<option value="${LOCA.escape(value)}">${LOCA.escape(label)}</option>`).join('');
  document.getElementById('orderActionNote').value='';
  document.getElementById('orderActionGuidance').textContent=config.guidance;
  document.getElementById('cancelOrderAction').textContent=config.secondary;
  document.getElementById('submitOrderAction').textContent=config.submit;
  const message=document.getElementById('orderActionMessage');
  message.textContent='';
  message.className='';
  dialog.showModal();
  setTimeout(()=>document.getElementById('orderActionReason')?.focus(),50);
}
function closeOrderAction(){
  const dialog=document.getElementById('orderActionDialog');
  if(dialog?.open)dialog.close();
}
async function executeCustomerOrderAction(orderId,action,reason=null,note=null){
  const{data,error}=await LOCA.db.rpc('customer_manage_order',{
    p_order_id:orderId,
    p_action:action,
    p_reason:reason,
    p_note:note
  });
  if(error)throw error;
  await loadMyOrders();
  return data;
}
async function submitOrderAction(event){
  event.preventDefault();
  const orderId=document.getElementById('orderActionOrderId').value;
  const action=document.getElementById('orderActionType').value;
  const reason=document.getElementById('orderActionReason').value;
  const note=document.getElementById('orderActionNote').value.trim()||null;
  const button=document.getElementById('submitOrderAction');
  const message=document.getElementById('orderActionMessage');
  if(!reason){
    message.textContent='Please choose a reason.';
    message.className='error';
    return;
  }
  button.disabled=true;
  button.textContent=action==='cancel'?'Cancelling…':'Sending…';
  message.textContent='Updating your order…';
  message.className='';
  try{
    const result=await executeCustomerOrderAction(orderId,action,reason,note);
    closeOrderAction();
    const cancelling=action==='cancel';
    LOCA.notice({
      eyebrow:cancelling?'Order cancelled':'Return requested',
      title:cancelling?'Your order has been cancelled.':'Your return request is with our team.',
      message:cancelling&&result?.payment_status==='Refund Pending'?'Payment was received, so the refund is now pending with the LOCA team.':cancelling?'The admin studio has been updated immediately.':'Track the review in My Orders. The admin studio now has your reason and note.',
      tone:'success',
      action:'Done'
    });
  }catch(error){
    message.textContent=error.message||'Your order could not be updated.';
    message.className='error';
  }finally{
    button.disabled=false;
    button.textContent=CUSTOMER_ORDER_ACTIONS[action]?.submit||'Send request';
  }
}
async function confirmOrderDelivery(orderId,button){
  const approved=await LOCA.ask({
    eyebrow:'Delivery confirmation',
    title:'Have you received this order?',
    message:'Confirm only after the parcel is in your hands. The order will be marked as delivered.',
    action:'Yes, received',
    secondaryAction:'Not yet',
    tone:'success'
  });
  if(!approved)return;
  const original=button?.textContent;
  if(button){button.disabled=true;button.textContent='Confirming…';}
  try{
    await executeCustomerOrderAction(orderId,'confirm_delivery');
    LOCA.notice({
      eyebrow:'Delivery confirmed',
      title:'Thank you for confirming.',
      message:'The order is now marked as delivered. Your seven-day return request window is available in My Orders.',
      tone:'success',
      action:'Done'
    });
  }catch(error){
    LOCA.notice({eyebrow:'Delivery update',title:'Delivery was not confirmed.',message:error.message||'Please try again.',tone:'error',action:'Close'});
  }finally{
    if(button){button.disabled=false;button.textContent=original||'Confirm delivery';}
  }
}
async function reorderOrder(orderId,button){
  const original=button?.textContent;
  if(button){button.disabled=true;button.textContent='Adding…';}
  try{
    const{data,error}=await LOCA.db.from('order_items').select('product_id,quantity').eq('order_id',orderId);
    if(error)throw error;
    const available=(data||[]).filter(item=>LOCA.products.some(product=>String(product.id)===String(item.product_id)));
    if(!available.length)throw new Error('The products from this order are not currently available.');
    await Promise.all(available.map(async item=>{
      const key=String(item.product_id);
      const quantity=Math.max(1,Number(item.quantity||1));
      LOCA.cart[key]=Math.min(20,Number(LOCA.cart[key]||0)+quantity);
      await LOCA.persistCartItem(item.product_id,LOCA.cart[key]);
    }));
    window.drawCart?.();
    window.closeAccount?.();
    window.openCartDrawer?.();
    LOCA.notice({
      eyebrow:'Buy again',
      title:'Available items were added to your bag.',
      message:available.length<(data||[]).length?'Some older items are no longer in the live catalogue and were skipped.':'Review quantities in your bag before checkout.',
      tone:'success',
      action:'View bag'
    });
  }catch(error){
    LOCA.notice({eyebrow:'Buy again',title:'Items were not added.',message:error.message||'Please try again.',tone:'error',action:'Close'});
  }finally{
    if(button){button.disabled=false;button.textContent=original||'Buy again';}
  }
}

document.addEventListener('input',event=>{if(['coNewAddress','coNewCity'].includes(event.target.id))syncNewAddress()});
document.getElementById('myOrderFilters')?.addEventListener('click',event=>{const button=event.target.closest('[data-order-filter]');if(!button)return;activeOrderFilter=button.dataset.orderFilter;document.querySelectorAll('[data-order-filter]').forEach(item=>item.classList.toggle('active',item===button));renderMyOrders()});
document.getElementById('myOrders')?.addEventListener('click',event=>{const action=event.target.closest('[data-order-action]');if(action)return openOrderAction(action.dataset.orderId,action.dataset.orderAction);const confirmButton=event.target.closest('[data-order-confirm-delivery]');if(confirmButton)return confirmOrderDelivery(confirmButton.dataset.orderConfirmDelivery,confirmButton);const reorder=event.target.closest('[data-reorder-order]');if(reorder)return reorderOrder(reorder.dataset.reorderOrder,reorder)});
document.getElementById('accountAddresses')?.addEventListener('click',event=>{const edit=event.target.closest('[data-edit-address]');if(edit)return editDeliveryAddress(edit.dataset.editAddress);const makeDefault=event.target.closest('[data-default-address]');if(makeDefault)return setDefaultAddress(makeDefault.dataset.defaultAddress).catch(error=>LOCA.notice({eyebrow:'Delivery address',title:'Default address was not changed.',message:error.message,tone:'error',action:'Close'}));const remove=event.target.closest('[data-delete-address]');if(remove)return deleteDeliveryAddress(remove.dataset.deleteAddress)});
document.getElementById('orderActionForm')?.addEventListener('submit',submitOrderAction);
document.getElementById('closeOrderAction')?.addEventListener('click',closeOrderAction);
document.getElementById('cancelOrderAction')?.addEventListener('click',closeOrderAction);
document.getElementById('orderActionDialog')?.addEventListener('cancel',event=>{event.preventDefault();closeOrderAction()});
window.openCheckout=openCheckout;window.closeCheckout=closeCheckout;window.placeOrder=placeOrder;window.loadMyOrders=loadMyOrders;window.loadDeliveryAddresses=loadDeliveryAddresses;window.renderAddressOptions=renderAddressOptions;window.toggleNewAddress=toggleNewAddress;window.applySavedAddress=applySavedAddress;window.saveDeliveryAddress=saveDeliveryAddress;window.resetAddressForm=resetAddressForm;window.openOrderAction=openOrderAction;window.closeOrderAction=closeOrderAction;window.confirmOrderDelivery=confirmOrderDelivery;window.reorderOrder=reorderOrder;
