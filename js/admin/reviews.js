(()=>{
  const $=id=>document.getElementById(id);
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let reviews=[];

  function productFor(review){return products.find(product=>String(product.id)===String(review.product_id))||null}
  function searchText(review){const product=productFor(review);return`${review.display_name||''} ${review.body||''} ${product?.name||''} ${review.rating||''}`.toLowerCase()}
  function stars(value){const rating=Math.max(0,Math.min(5,Number(value)||0));return`<span class="review-admin-stars" aria-label="${rating} out of 5 stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</span>`}

  function renderAdminReviews(){
    const query=($('reviewAdminSearch')?.value||'').trim().toLowerCase();
    const filter=$('reviewAdminFilter')?.value||'all';
    const list=reviews.filter(review=>(filter==='all'||(filter==='approved'?review.approved:!review.approved))&&searchText(review).includes(query));
    const pending=reviews.filter(review=>!review.approved).length;
    if($('reviewAdminCount'))$('reviewAdminCount').textContent=`${list.length} shown · ${pending} pending · ${reviews.length} total`;
    if($('sideReviewCount'))$('sideReviewCount').textContent=pending||reviews.length;
    if(!$('reviewAdminBody'))return;
    $('reviewAdminBody').innerHTML=list.length?list.map(review=>{
      const product=productFor(review);
      return `<article class="review-admin-card ${review.approved?'is-approved':'is-pending'}">
        <div class="review-admin-card-head"><div>${stars(review.rating)}<span class="review-state">${review.approved?'Published':'Pending approval'}</span></div><time>${new Date(review.created_at).toLocaleString('en-PK')}</time></div>
        <blockquote>“${escape(review.body)}”</blockquote>
        <div class="review-admin-identity"><div><small>Customer</small><strong>${escape(review.display_name||'LOCA customer')}</strong></div><div><small>Product</small><strong>${escape(product?.name||`Product ${review.product_id}`)}</strong></div></div>
        <div class="review-admin-actions">${review.approved?`<button class="btn alt" type="button" data-review-action="hide" data-review-id="${escape(review.id)}">Hide from store</button>`:`<button class="btn btn-primary" type="button" data-review-action="approve" data-review-id="${escape(review.id)}">Approve & publish</button>`}<button class="btn danger-ghost" type="button" data-review-action="delete" data-review-id="${escape(review.id)}">Delete</button></div>
      </article>`;
    }).join(''):'<div class="review-admin-empty"><b>No reviews in this view.</b><span>Delivered customers can submit a review from a product window.</span></div>';
  }

  async function loadAdminReviews({quiet=false}={}){
    if(!quiet&&$('reviewAdminBody'))$('reviewAdminBody').innerHTML='<div class="review-admin-empty"><b>Loading reviews…</b></div>';
    try{
      const{data,error}=await db.from('product_reviews').select('*').order('created_at',{ascending:false});
      if(error)throw error;
      reviews=data||[];
      renderAdminReviews();
    }catch(error){
      if($('reviewAdminBody'))$('reviewAdminBody').innerHTML=`<div class="review-admin-empty is-error"><b>Reviews could not be loaded.</b><span>${escape(error.message||'Please refresh the page.')}</span></div>`;
      if(!quiet)adminNotify(error.message||'Reviews could not be loaded.',{title:'Review sync failed',tone:'error'});
    }
  }

  async function updateReview(id,approved){
    const review=reviews.find(item=>String(item.id)===String(id));
    if(!review)return;
    try{
      if(!await isCurrentUserAdmin())throw new Error('Your admin session has expired.');
      const{data,error}=await db.from('product_reviews').update({approved}).eq('id',review.id).select('*').single();
      if(error)throw error;
      reviews=reviews.map(item=>String(item.id)===String(id)?data:item);
      renderAdminReviews();
      adminNotify(approved?'The review is now visible on the storefront.':'The review was hidden from the storefront.',{title:approved?'Review published':'Review hidden'});
    }catch(error){
      adminNotify(error.message||'The review could not be updated.',{title:'Review not updated',tone:'error'});
    }
  }

  async function deleteReview(id){
    const review=reviews.find(item=>String(item.id)===String(id));
    if(!review)return;
    const accepted=await confirmAction({eyebrow:'Review moderation',title:'Delete this review?',message:'This permanently removes the customer review. It will not be saved in another section.',confirmLabel:'Delete review'});
    if(!accepted)return;
    try{
      if(!await isCurrentUserAdmin())throw new Error('Your admin session has expired.');
      const{error}=await db.from('product_reviews').delete().eq('id',review.id);
      if(error)throw error;
      reviews=reviews.filter(item=>String(item.id)!==String(id));
      renderAdminReviews();
      adminNotify('The review was permanently deleted.',{title:'Review deleted'});
    }catch(error){
      adminNotify(error.message||'The review could not be deleted.',{title:'Delete failed',tone:'error'});
    }
  }

  $('reviewAdminSearch')?.addEventListener('input',renderAdminReviews);
  $('reviewAdminFilter')?.addEventListener('change',renderAdminReviews);
  $('reviewAdminBody')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-review-action]');
    if(!button)return;
    if(button.dataset.reviewAction==='approve')return updateReview(button.dataset.reviewId,true);
    if(button.dataset.reviewAction==='hide')return updateReview(button.dataset.reviewId,false);
    if(button.dataset.reviewAction==='delete')return deleteReview(button.dataset.reviewId);
  });
  document.querySelectorAll('.tab').forEach(button=>button.addEventListener('click',()=>{
    const selected=button.dataset.tab==='reviews';
    if($('reviewsSection'))$('reviewsSection').style.display=selected?'block':'none';
    if(selected){$('pageTitle').textContent='Approve the voices behind the pieces.';loadAdminReviews({quiet:true});}
  }));

  window.loadAdminReviews=loadAdminReviews;
})();
