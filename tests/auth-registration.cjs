const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js/auth.js'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/LOCA_verified_registration.sql'),'utf8');
const verificationPage=fs.readFileSync(path.join(root,'verify.html'),'utf8');
const verificationScript=fs.readFileSync(path.join(root,'js/verify.js'),'utf8');

const storage={};
let profileQueries=0;
const emptyNode=()=>({
  value:'',
  hidden:false,
  required:false,
  disabled:false,
  textContent:'',
  className:'',
  classList:{add(){},remove(){},contains(){return false;},toggle(){}},
  focus(){},
  reset(){},
  addEventListener(){}
});
const elements={};
const context={
  window:{location:{href:'https://locacollection.github.io/locacollection1/'},history:{replaceState(){}}},
  document:{
    title:'LOCA',
    getElementById:id=>elements[id]??=emptyNode(),
    querySelector(){return null;},
    querySelectorAll(){return[];},
    addEventListener(){},
    body:{classList:{add(){},remove(){}}}
  },
  localStorage:{
    getItem:key=>storage[key]||null,
    setItem:(key,value)=>{storage[key]=String(value);},
    removeItem:key=>{delete storage[key];}
  },
  URL,
  URLSearchParams,
  console,
  setTimeout:fn=>{fn();return 1;},
  setInterval:()=>1,
  clearInterval(){},
  Promise,
  LOCA:{
    authMode:'signin',
    currentUser:null,
    db:{
      from:table=>{
        assert.equal(table,'profiles');
        profileQueries+=1;
        return{select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:'verified-user',email:'verified@example.com'},error:null})})})};
      },
      auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){},signOut:async()=>({})}
    }
  }
};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context);

assert.equal(context.LOCA.EMAIL_CONFIRMATION_URL,'https://locacollection.github.io/locacollection1/verify.html');
assert.equal(context.LOCA.isVerifiedUser({email_confirmed_at:null}),false);
assert.equal(context.LOCA.isVerifiedUser({email_confirmed_at:'2026-09-22T00:00:00Z'}),true);
assert(!/from\(['"]profiles['"]\)\.insert/.test(source),'browser code must not insert profiles');
assert(!/from\(['"]profiles['"]\)\.upsert/.test(source),'browser code must not upsert profiles');

(async()=>{
  context.LOCA.currentUser={id:'pending-user',email:'pending@example.com',email_confirmed_at:null};
  await assert.rejects(()=>context.LOCA.ensureProfile(),/Verify your email/);
  assert.equal(profileQueries,0,'unverified users must not query or create profiles');

  context.LOCA.currentUser={id:'verified-user',email:'verified@example.com',email_confirmed_at:'2026-09-22T00:00:00Z'};
  const profile=await context.LOCA.ensureProfile();
  assert.equal(profile.id,'verified-user');
  assert.equal(profileQueries,1);

  assert.match(source,/emailRedirectTo:LOCA_EMAIL_CONFIRMATION_URL/);
  assert.match(migration,/if new\.email_confirmed_at is null then/i);
  assert.match(migration,/update of email, email_confirmed_at, raw_user_meta_data/i);
  assert.match(migration,/revoke insert on table public\.profiles from authenticated/i);
  assert.match(verificationPage,/Your customer profile is created only after this email check succeeds/);
  assert.match(verificationScript,/waitForVerifiedSession/);
  assert.match(verificationScript,/waitForProfile/);

  console.log('PASS: verified registration gate, redirect page, and profile lifecycle tests');
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
