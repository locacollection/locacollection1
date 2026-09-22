(()=>{
  const $=id=>document.getElementById(id);
  const clean=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let archivedOrders=[];

  function archivedItems(record){return Array.isArray(record?.items)?record.items:[]}
  function archivedActions(record){return Array.isArray(record?.customer_actions)?record.customer_actions:[]}
  function archiveSearchText(record){return [record.order_number,record.customer_name,record.customer_email,record.customer_phone,record.customer_city,record.status,record.payment_status,record.archive_reason].join(' ').toLowerCase()}

  function renderArchivedOrders(){
    const query=($('archiveSearch')?.value||'').trim().toLowerCase();
    const list=archivedOrders.filter(record=>archiveSearchText(record).includes(query));
    if($('archiveCount'))$('archiveCount').textContent=`${list.length} shown · ${archivedOrders.length} archived`;
    if($('sideArchiveCount'))$('sideArchiveCount').textContent=archivedOrders.length;
    if(!$('archiveBody'))return;
    $('archiveBody').innerHTML=list.length?list.map(record=>{
      const itemCount=archivedItems(record).reduce((sum,item)=>sum+Number(item.quantity||item.qty||0),0);
      return `<article class="archive-card"><div class="archive-card-top"><div><p class="kicker">Archived order</p><h3>${clean(record.order_number||record.original_order_id)}</h3><span>${new Date(record.archived_at).toLocaleString('en-PK')}</span></div><div class="archive-workflow">${orderStatusBadge(record.status)}${paymentStatusBadge(record.payment_status)}</div></div><div class="archive-facts"><div><span>Customer</span><strong>${clean(record.customer_name||'Unnamed customer')}</strong><small>${clean(record.customer_email||'No email')}</small></div><div><span>Order</span><strong>${itemCount} item${itemCount===1?'':'s'}</strong><small>${new Date(record.ordered_at||record.archived_at).toLocaleDateString('en-PK')}</small></div><div><span>Value</span><strong>${money(record.total)}</strong><small>${clean(record.payment_method||'Payment not recorded')}</small></div></div>${record.archive_reason?`<p class="archive-note"><b>Archive note</b>${clean(record.archive_reason)}</p>`:''}<div class="archive-actions"><button class="smallbtn" type="button" data-inspect-archive="${clean(record.id)}">Inspect snapshot</button><button class="smallbtn danger-action" type="button" data-delete-archive="${clean(record.id)}">Delete forever</button></div></article>`;
    }).join(''):'<div class="archive-empty"><div>◇</div><h3>The Order Archive is empty.</h3><p>Orders removed from the live workflow will appear here with their customer, items and activity snapshot.</p></div>';
    $('archiveBody').querySelectorAll('.archive-card').forEach(card=>{const recordId=card.querySelector('[data-delete-archive]')?.dataset.deleteArchive;if(recordId&&!card.querySelector('[data-archive-select]')){const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.dataset.archiveSelect=recordId;checkbox.setAttribute('aria-label','Select archived order');card.prepend(checkbox)}});
  }

  function ensureBulkArchiveControls(){
    const head=document.querySelector('#archiveSection .section-head .toolbar-actions');
    if(!head||head.querySelector('[data-delete-selected-archive]'))return;
    const selectAll=document.createElement('button');selectAll.className='btn alt';selectAll.type='button';selectAll.textContent='Select all';selectAll.dataset.selectAllArchive='';
    const deleteSelected=document.createElement('button');deleteSelected.className='btn danger';deleteSelected.type='button';deleteSelected.textContent='Delete selected';deleteSelected.dataset.deleteSelectedArchive='';
    const deleteAll=document.createElement('button');deleteAll.className='btn danger';deleteAll.type='button';deleteAll.textContent='Delete all';deleteAll.dataset.deleteAllArchive='';
    head.append(selectAll,deleteSelected,deleteAll);
  }

  async function bulkDeleteArchived(ids){
    if(!ids.length)return;
    const approved=await confirmAction({eyebrow:'Permanent deletion',title:`Delete ${ids.length} archived order${ids.length===1?'':'s'}?`,message:'These archive records will be permanently erased and cannot be recovered.',confirmLabel:'Delete forever'});if(!approved)return;
    try{if(!await isCurrentUserAdmin())throw new Error('Your admin session has expired.');for(const id of ids){const{error}=await db.rpc('admin_permanently_delete_archived_order',{p_archive_id:id});if(error)throw error}archivedOrders=archivedOrders.filter(record=>!ids.includes(String(record.id)));renderArchivedOrders();adminNotify(`${ids.length} archived order${ids.length===1?'':'s'} deleted.`,{title:'Archive updated'})}catch(error){adminNotify(error.message||'Selected archive records could not be deleted.',{title:'Bulk deletion failed',tone:'error'})}
  }

  async function loadArchivedOrders({quiet=false}={}){
    if(!$('archiveBody'))return;
    if(!quiet)$('archiveBody').innerHTML='<div class="archive-empty"><p>Loading archived orders…</p></div>';
    const{data,error}=await db.from('archived_orders').select('*').order('archived_at',{ascending:false});
    if(error){
      archivedOrders=[];
      $('archiveBody').innerHTML=`<div class="archive-empty is-error"><h3>Archive unavailable.</h3><p>${clean(error.message)}</p></div>`;
      if(!quiet)adminNotify(error.message||'The Order Archive could not be loaded.',{title:'Archive unavailable',tone:'error'});
      return;
    }
    archivedOrders=data||[];
    renderArchivedOrders();
  }

  function closeArchiveDialog(){const dialog=$('archiveOrderDialog');if(dialog?.open)dialog.close()}

  function openArchiveOrder(orderId){
    const order=(orders||[]).find(entry=>String(entry.id)===String(orderId));
    if(!order)return;
    const record=typeof customer==='function'?customer(order):{};
    const count=(typeof items==='function'?items(order):[]).reduce((sum,item)=>sum+Number(item.quantity||item.qty||0),0);
    $('archiveOrderId').value=order.id;
    $('archiveOrderTitle').textContent=order.order_number||order.id;
    $('archiveOrderIntro').textContent=`${typeof customerName==='function'?customerName(record):(record.name||'Customer')} · ${money(order.total)}`;
    $('archiveOrderSummary').innerHTML=`<div><span>Customer</span><strong>${clean(typeof customerName==='function'?customerName(record):(record.name||'Customer'))}</strong><small>${clean(record.email||record.phone||'Contact details retained in snapshot')}</small></div><div><span>Order contents</span><strong>${count} item${count===1?'':'s'}</strong><small>${clean(order.status||'Pending')} · ${clean(order.payment_status||'Unpaid')}</small></div>`;
    $('archiveReason').value='';
    $('archiveMessage').textContent='';
    $('archiveMessage').className='';
    $('modal')?.classList.remove('open');
    closeOrderWorkflow?.();
    $('archiveOrderDialog').showModal();
    setTimeout(()=>$('archiveReason')?.focus(),40);
  }

  async function submitArchiveOrder(event){
    event.preventDefault();
    const id=$('archiveOrderId').value;
    const reason=$('archiveReason').value.trim()||null;
    const button=$('confirmArchiveOrder');
    button.disabled=true;
    button.textContent='Archiving…';
    $('archiveMessage').textContent='Saving the complete order snapshot…';
    try{
      if(!await isCurrentUserAdmin())throw new Error('Your admin session has expired.');
      const{data,error}=await db.rpc('admin_archive_order',{p_order_id:id,p_reason:reason});
      if(error)throw error;
      const record=Array.isArray(data)?data[0]:data;
      closeArchiveDialog();
      await load();
      await loadArchivedOrders({quiet:true});
      adminNotify(`${record?.order_number||'Order'} was moved out of the live workflow.`,{title:'Order archived'});
    }catch(error){
      $('archiveMessage').textContent=error.message||'The order could not be archived.';
      $('archiveMessage').className='error';
      adminNotify($('archiveMessage').textContent,{title:'Archive failed',tone:'error',duration:6000});
    }finally{
      button.disabled=false;
      button.textContent='Move to Order Archive';
    }
  }

  function viewArchivedOrder(id){
    const record=archivedOrders.find(entry=>String(entry.id)===String(id));
    if(!record)return;
    const itemsHtml=archivedItems(record).map(item=>`<div class="item"><span>${clean(item.product_name||item.name||'Product')} × ${Number(item.quantity||item.qty||0)}</span><b>${money(Number(item.price||item.unit_price||0)*Number(item.quantity||item.qty||0))}</b></div>`).join('')||'<p class="muted">No item snapshot was available.</p>';
    const actionsHtml=archivedActions(record).length?`<div class="customer-action-timeline"><p class="kicker">Customer activity snapshot</p>${archivedActions(record).map(action=>`<div class="customer-action-entry"><div><strong>${clean(action.action_type)}</strong><span>${new Date(action.created_at).toLocaleString('en-PK')}</span></div><div>${action.reason?`<b>${clean(action.reason)}</b>`:''}${action.note?`<p>${clean(action.note)}</p>`:''}</div></div>`).join('')}</div>`:'';
    $('modalTitle').textContent=record.order_number||record.original_order_id;
    $('modalBody').innerHTML=`<div class="archive-snapshot-banner"><div><p class="kicker">Order Archive</p><strong>Read-only historical snapshot</strong><span>Archived ${new Date(record.archived_at).toLocaleString('en-PK')}</span></div><button class="smallbtn danger-action" type="button" data-delete-archive="${clean(record.id)}">Delete forever</button></div><div class="order-detail-workflow"><div><small>Fulfilment at archive</small>${orderStatusBadge(record.status)}</div><div><small>Payment at archive</small>${paymentStatusBadge(record.payment_status)}</div></div><div class="grid"><div class="detail"><span>Customer</span>${clean(record.customer_name||'Unnamed customer')}</div><div class="detail"><span>Phone</span>${clean(record.customer_phone||'Not provided')}</div><div class="detail"><span>Email</span>${clean(record.customer_email||'Not provided')}</div><div class="detail"><span>City</span>${clean(record.customer_city||'Not provided')}</div><div class="detail"><span>Payment method</span>${clean(record.payment_method||'Not recorded')}</div><div class="detail"><span>Original order date</span>${new Date(record.ordered_at||record.archived_at).toLocaleString('en-PK')}</div><div class="detail" style="grid-column:1/-1"><span>Delivery address</span>${clean(record.customer_address||'Not provided')}</div>${record.archive_reason?`<div class="detail" style="grid-column:1/-1"><span>Archive note</span>${clean(record.archive_reason)}</div>`:''}</div>${actionsHtml}<div class="order-line-items">${itemsHtml}</div><div class="total"><span>Archived order total</span><b>${money(record.total)}</b></div>`;
    $('modal').classList.add('open');
  }

  async function permanentlyDeleteArchivedOrder(id){
    const record=archivedOrders.find(entry=>String(entry.id)===String(id));
    if(!record)return;
    const approved=await confirmAction({eyebrow:'Permanent deletion',title:`Delete ${record.order_number||'this archived order'} forever?`,message:'This permanently erases the archived order, customer snapshot, item list and activity history. It cannot be recovered and will not be saved anywhere else.',confirmLabel:'Delete forever'});
    if(!approved)return;
    try{
      if(!await isCurrentUserAdmin())throw new Error('Your admin session has expired.');
      const{error}=await db.rpc('admin_permanently_delete_archived_order',{p_archive_id:record.id});
      if(error)throw error;
      $('modal')?.classList.remove('open');
      archivedOrders=archivedOrders.filter(entry=>String(entry.id)!==String(record.id));
      renderArchivedOrders();
      adminNotify(`${record.order_number||'Archived order'} was permanently erased.`,{title:'Archive record deleted'});
    }catch(error){
      adminNotify(error.message||'The archived order could not be deleted.',{title:'Permanent deletion failed',tone:'error',duration:6000});
    }
  }

  $('archiveSearch')?.addEventListener('input',renderArchivedOrders);
  $('archiveBody')?.addEventListener('click',event=>{const inspect=event.target.closest('[data-inspect-archive]');if(inspect)return viewArchivedOrder(inspect.dataset.inspectArchive);const remove=event.target.closest('[data-delete-archive]');if(remove)return permanentlyDeleteArchivedOrder(remove.dataset.deleteArchive)});
  ensureBulkArchiveControls();
  document.querySelector('#archiveSection .toolbar-actions')?.addEventListener('click',event=>{if(event.target.closest('[data-select-all-archive]')){$('archiveBody').querySelectorAll('[data-archive-select]').forEach(input=>{input.checked=true})}if(event.target.closest('[data-delete-selected-archive]'))bulkDeleteArchived([...$('archiveBody').querySelectorAll('[data-archive-select]:checked')].map(input=>input.dataset.archiveSelect));if(event.target.closest('[data-delete-all-archive]'))bulkDeleteArchived(archivedOrders.map(record=>String(record.id)))});
  $('modalBody')?.addEventListener('click',event=>{const remove=event.target.closest('[data-delete-archive]');if(remove)return permanentlyDeleteArchivedOrder(remove.dataset.deleteArchive)});
  $('archiveOrderForm')?.addEventListener('submit',submitArchiveOrder);
  $('closeArchiveOrder')?.addEventListener('click',closeArchiveDialog);
  $('cancelArchiveOrder')?.addEventListener('click',closeArchiveDialog);
  $('archiveOrderDialog')?.addEventListener('cancel',event=>{event.preventDefault();closeArchiveDialog()});
  document.querySelectorAll('.tab').forEach(button=>button.addEventListener('click',()=>{
    const selected=button.dataset.tab==='archive';
    if($('archiveSection'))$('archiveSection').style.display=selected?'block':'none';
    if(selected){$('pageTitle').textContent='A clean archive, when the live book needs space.';loadArchivedOrders({quiet:true})}
  }));

  window.openArchiveOrder=openArchiveOrder;
  window.loadArchivedOrders=loadArchivedOrders;
  window.viewArchivedOrder=viewArchivedOrder;
})();
