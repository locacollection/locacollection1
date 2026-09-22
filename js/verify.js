window.LOCA=window.LOCA||{};

const VERIFY_HOME_URL='./?verified=1';
const VERIFY_SIGN_IN_URL='./?auth=signin';
const PENDING_EMAIL_KEY='loca_pending_verification_email';
const $=id=>document.getElementById(id);
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
let redirectTimer=null;

function authErrorFromUrl(){
  const url=new URL(window.location.href);
  const hash=new URLSearchParams(url.hash.replace(/^#/,''));
  return url.searchParams.get('error_description')||hash.get('error_description')||'';
}

function cleanVerificationUrl(){
  const url=new URL(window.location.href);
  ['code','token_hash','type','error','error_code','error_description'].forEach(key=>url.searchParams.delete(key));
  url.hash='';
  window.history.replaceState({},document.title,url.pathname+(url.search||''));
}

function setState(state,{eyebrow,title,message,status,email}={}){
  const mark=$('verificationMark');
  mark.className=`verification-mark is-${state}`;
  $('verificationEyebrow').textContent=eyebrow||'Secure registration';
  $('verificationTitle').textContent=title||'';
  $('verificationMessage').textContent=message||'';
  $('verificationStatus').textContent=status||'';
  $('verificationProgress').hidden=state!=='working';
  $('verificationContinue').hidden=state==='working';
  $('verificationResend').hidden=state!=='error'||!localStorage.getItem(PENDING_EMAIL_KEY);
  $('verifiedAccount').hidden=state!=='success';
  if(email)$('verifiedEmail').textContent=email;
}

async function exchangeSupportedConfirmation(){
  const url=new URL(window.location.href);
  const code=url.searchParams.get('code');
  const tokenHash=url.searchParams.get('token_hash');
  const type=url.searchParams.get('type')||'signup';
  if(code){
    const{error}=await LOCA.db.auth.exchangeCodeForSession(code);
    if(error)throw error;
  }else if(tokenHash){
    const{error}=await LOCA.db.auth.verifyOtp({token_hash:tokenHash,type});
    if(error)throw error;
  }
}

async function waitForVerifiedSession(){
  for(let attempt=0;attempt<24;attempt+=1){
    const{data,error}=await LOCA.db.auth.getSession();
    if(error)throw error;
    if(data.session){
      const{data:userData,error:userError}=await LOCA.db.auth.getUser();
      if(userError)throw userError;
      if(userData.user?.email_confirmed_at||userData.user?.confirmed_at)return userData.user;
      throw new Error('Your email has not been confirmed yet.');
    }
    await wait(250);
  }
  throw new Error('This verification link is invalid, expired, or has already been used.');
}

async function waitForProfile(userId){
  for(let attempt=0;attempt<12;attempt+=1){
    const{data,error}=await LOCA.db.from('profiles').select('id').eq('id',userId).maybeSingle();
    if(error)throw error;
    if(data)return;
    $('verificationStatus').textContent='Creating your verified LOCA profile…';
    await wait(180);
  }
  throw new Error('Your email is verified, but the profile is still being prepared. Sign in again in a moment.');
}

function scheduleReturn(){
  let seconds=4;
  $('verificationStatus').textContent=`Returning to the collection in ${seconds} seconds…`;
  redirectTimer=setInterval(()=>{
    seconds-=1;
    if(seconds<=0){clearInterval(redirectTimer);window.location.replace(VERIFY_HOME_URL);return;}
    $('verificationStatus').textContent=`Returning to the collection in ${seconds} seconds…`;
  },1000);
}

async function verifyRegistration(){
  const urlError=authErrorFromUrl();
  if(urlError){
    cleanVerificationUrl();
    setState('error',{eyebrow:'Link not completed',title:'We could not verify this link.',message:urlError.replace(/\+/g,' '),status:'Request a fresh email and use the newest verification link.'});
    return;
  }
  try{
    $('verificationStatus').textContent='Validating the secure confirmation…';
    await exchangeSupportedConfirmation();
    const user=await waitForVerifiedSession();
    $('verificationStatus').textContent='Email confirmed. Activating your profile…';
    await waitForProfile(user.id);
    localStorage.removeItem(PENDING_EMAIL_KEY);
    cleanVerificationUrl();
    $('verificationContinue').href=VERIFY_HOME_URL;
    setState('success',{eyebrow:'Verification complete',title:'Your LOCA account is ready.',message:'Your email has been verified and your private customer profile is now active.',status:'Opening the collection…',email:user.email||'Verified email'});
    scheduleReturn();
  }catch(error){
    cleanVerificationUrl();
    $('verificationContinue').href=VERIFY_SIGN_IN_URL;
    setState('error',{eyebrow:'Verification interrupted',title:'This link could not be completed.',message:error.message||'The verification link may have expired.',status:'If you already verified this email, continue to LOCA and sign in.'});
  }
}

async function resendVerification(){
  const email=localStorage.getItem(PENDING_EMAIL_KEY)||'';
  const button=$('verificationResend');
  if(!email){window.location.href=VERIFY_SIGN_IN_URL;return;}
  button.disabled=true;button.textContent='Sending…';$('verificationStatus').textContent='Requesting a new secure link…';
  try{
    const redirectTo=new URL('verify.html',window.location.href).href.split(/[?#]/)[0];
    const{error}=await LOCA.db.auth.resend({type:'signup',email,options:{emailRedirectTo:redirectTo}});
    if(error)throw error;
    $('verificationStatus').textContent='A fresh verification email was sent. Use the newest link.';
    button.textContent='Email sent';
  }catch(error){
    $('verificationStatus').textContent=error.message||'The email could not be resent. Please try again.';
    button.disabled=false;button.textContent='Try resending again';
  }
}

$('verificationResend')?.addEventListener('click',resendVerification);
$('verificationContinue')?.addEventListener('click',()=>clearInterval(redirectTimer));
verifyRegistration();
