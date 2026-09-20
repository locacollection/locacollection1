window.LOCA = window.LOCA || {};

function updateAuthUI(){
  const title = document.getElementById("authTitle");
  const submit = document.getElementById("authSubmit");
  const switcher = document.getElementById("authSwitch");
  const nameField = document.getElementById("authNameField");
  const confirmField = document.getElementById("authConfirmField");
  if(!title || !submit || !switcher) return;

  const signup = LOCA.authMode === "signup";
  title.textContent = signup ? "Create your LOCA account." : "Sign in to continue.";
  submit.textContent = signup ? "Create Account" : "Sign In";
  if(nameField) nameField.hidden = !signup;
  if(confirmField) confirmField.hidden = !signup;
  switcher.innerHTML = signup
    ? 'Already have an account? <button onclick="toggleAuthMode();return false">Sign in</button>'
    : 'New to LOCA? <button onclick="toggleAuthMode();return false">Create an account</button>';
}

function openAuth(mode){
  if(mode) LOCA.authMode = mode;
  updateAuthUI();
  document.getElementById("authModal")?.classList.add("open");
  document.body.classList.add("lock");
}

function closeAuth(){
  document.getElementById("authModal")?.classList.remove("open");
  document.body.classList.remove("lock");
}

function toggleAuthMode(){
  LOCA.authMode = LOCA.authMode === "signin" ? "signup" : "signin";
  updateAuthUI();
}

async function handleAuth(event){
  event.preventDefault();
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const name = document.getElementById("authName")?.value.trim() || "";
  const confirm = document.getElementById("authConfirm")?.value || "";
  const button = document.getElementById("authSubmit");

  if(LOCA.authMode === "signup"){
    if(!name){ alert("Please enter your full name."); return; }
    if(password !== confirm){ alert("Passwords do not match."); return; }
  }

  button.disabled = true;
  button.textContent = LOCA.authMode === "signin" ? "Signing in..." : "Creating account...";

  try{
    let result;
    if(LOCA.authMode === "signin"){
      result = await LOCA.db.auth.signInWithPassword({email, password});
    } else {
      result = await LOCA.db.auth.signUp({
        email,
        password,
        options: {data: {full_name: name}}
      });
    }
    if(result.error) throw result.error;

    if(LOCA.authMode === "signup" && !result.data.session){
      alert("Account created. Please verify your email, then sign in.");
      LOCA.authMode = "signin";
      updateAuthUI();
      return;
    }

    closeAuth();
  } catch(err){
    alert(err.message || "Authentication failed.");
  } finally {
    button.disabled = false;
    updateAuthUI();
  }
}

LOCA.ensureProfile = async function(){
  if(!LOCA.currentUser) return null;
  const {data, error} = await LOCA.db.from("profiles").select("*").eq("id", LOCA.currentUser.id).maybeSingle();
  if(error) throw error;
  if(data){
    LOCA.profile = data;
    return data;
  }
  const fallback = {
    id: LOCA.currentUser.id,
    email: LOCA.currentUser.email || "",
    full_name: LOCA.currentUser.user_metadata?.full_name || ""
  };
  const {data: inserted, error: insertError} = await LOCA.db.from("profiles").upsert(fallback).select("*").single();
  if(insertError) throw insertError;
  LOCA.profile = inserted;
  return inserted;
};

function renderAccountHeader(){
  const dots = document.querySelectorAll(".user-dot");
  dots.forEach(button => {
    button.textContent = LOCA.currentUser ? "●" : "♙";
    button.title = LOCA.currentUser ? "My account" : "Sign in";
  });
  const footerLink = document.getElementById("footerAccountLink");
  if(footerLink) footerLink.textContent = LOCA.currentUser ? "My Account" : "Sign In";
}

async function openAccount(){
  if(!LOCA.currentUser){
    openAuth("signin");
    return;
  }
  try{
    await LOCA.ensureProfile();
    populateProfileForm();
    renderAddressBook();
    document.getElementById("accountModal")?.classList.add("open");
    document.body.classList.add("lock");
    if(window.loadMyOrders) loadMyOrders();
  } catch(err){
    console.error(err);
    alert("Your account could not be loaded. Please try again.");
  }
}

function closeAccount(){
  document.getElementById("accountModal")?.classList.remove("open");
  document.body.classList.remove("lock");
}

function populateProfileForm(){
  const p = LOCA.profile || {};
  const email = LOCA.currentUser?.email || p.email || "";
  document.getElementById("profileEmail").value = email;
  document.getElementById("profileName").value = p.full_name || "";
  document.getElementById("profilePhone").value = p.phone || "";
  document.getElementById("profileAddress").value = p.address || "";
  document.getElementById("profileCity").value = p.city || "";
  const label = document.getElementById("accountIdentity");
  if(label) label.textContent = (p.full_name || email) + " · " + email;
}

async function saveProfile(event){
  if(event) event.preventDefault();
  if(!LOCA.currentUser) return;
  const button = document.getElementById("profileSave");
  if(button){ button.disabled = true; button.textContent = "Saving..."; }
  try{
    const payload = {
      id: LOCA.currentUser.id,
      email: LOCA.currentUser.email || "",
      full_name: document.getElementById("profileName").value.trim(),
      phone: document.getElementById("profilePhone").value.trim(),
      address: document.getElementById("profileAddress").value.trim(),
      city: document.getElementById("profileCity").value.trim(),
      updated_at: new Date().toISOString()
    };
    const {data, error} = await LOCA.db.from("profiles").upsert(payload).select("*").single();
    if(error) throw error;
    LOCA.profile = data;
    populateProfileForm();
    showAccountMessage("Profile saved.");
  } catch(err){
    alert(err.message || "Profile could not be saved.");
  } finally {
    if(button){ button.disabled = false; button.textContent = "Save Profile"; }
  }
}

function showAccountMessage(message){
  const box = document.getElementById("accountMessage");
  if(!box) return;
  box.textContent = message;
  box.hidden = false;
  setTimeout(() => { box.hidden = true; }, 2500);
}

// Multi-Address Management
function getAddressStorageKey(){
  return LOCA.currentUser ? ("loca_addresses_" + LOCA.currentUser.id) : null;
}

function getSavedAddresses(){
  const key = getAddressStorageKey();
  if(!key) return [];
  try{
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch(e){
    return [];
  }
}

function saveAddressesList(list){
  const key = getAddressStorageKey();
  if(!key) return;
  localStorage.setItem(key, JSON.stringify(list));
}

function renderAddressBook(){
  const container = document.getElementById("addressBookList");
  if(!container) return;
  const addresses = getSavedAddresses();
  if(!addresses.length){
    container.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:8px 0">No alternate delivery addresses added yet. Add work, home, or family addresses above.</div>';
    return;
  }
  container.innerHTML = addresses.map((addr, idx) => `
    <div class="address-card ${addr.isDefault ? 'is-default' : ''}">
      <div class="address-card-header">
        <div class="address-card-title">
          <span>${LOCA.esc(addr.title || 'Address')}</span>
          ${addr.isDefault ? '<span class="badge-default">DEFAULT</span>' : ''}
        </div>
        <div class="address-card-actions">
          ${!addr.isDefault ? `<button type="button" onclick="setDefaultAddress(${idx})">Set as default</button>` : ''}
          <button type="button" class="del" onclick="deleteAddress(${idx})">Delete</button>
        </div>
      </div>
      <div class="address-card-body">
        <strong>${LOCA.esc(addr.name || '')}</strong> · ${LOCA.esc(addr.phone || '')}<br>
        ${LOCA.esc(addr.address || '')}, ${LOCA.esc(addr.city || '')}
      </div>
    </div>
  `).join("");
}

function toggleAddAddressForm(){
  const form = document.getElementById("newAddressForm");
  if(!form) return;
  const isHidden = form.style.display === "none" || !form.style.display;
  form.style.display = isHidden ? "block" : "none";
  if(isHidden){
    document.getElementById("newAddrTitle").value = "";
    document.getElementById("newAddrName").value = LOCA.profile?.full_name || "";
    document.getElementById("newAddrPhone").value = LOCA.profile?.phone || "";
    document.getElementById("newAddrCity").value = LOCA.profile?.city || "";
    document.getElementById("newAddrStreet").value = "";
    document.getElementById("newAddrDefault").checked = false;
  }
}

async function saveNewAddress(e){
  if(e) e.preventDefault();
  if(!LOCA.currentUser) return;
  const title = document.getElementById("newAddrTitle").value.trim();
  const name = document.getElementById("newAddrName").value.trim();
  const phone = document.getElementById("newAddrPhone").value.trim();
  const city = document.getElementById("newAddrCity").value.trim();
  const street = document.getElementById("newAddrStreet").value.trim();
  const isDefault = document.getElementById("newAddrDefault").checked;

  if(!title || !name || !phone || !city || !street){
    alert("Please fill all fields for this address.");
    return;
  }

  let addresses = getSavedAddresses();
  if(isDefault){
    addresses = addresses.map(a => ({...a, isDefault: false}));
  }

  addresses.push({
    id: 'addr_' + Date.now(),
    title,
    name,
    phone,
    city,
    address: street,
    isDefault: !!isDefault
  });

  saveAddressesList(addresses);

  if(isDefault){
    // Also update main profile default
    try {
      const payload = {
        id: LOCA.currentUser.id,
        email: LOCA.currentUser.email || "",
        full_name: name,
        phone: phone,
        address: street,
        city: city,
        updated_at: new Date().toISOString()
      };
      const {data, error} = await LOCA.db.from("profiles").upsert(payload).select("*").single();
      if(!error && data) {
        LOCA.profile = data;
        populateProfileForm();
      }
    } catch(err){
      console.warn("Could not sync default profile to DB:", err);
    }
  }

  toggleAddAddressForm();
  renderAddressBook();
  showAccountMessage("Address added to your address book.");
}

async function setDefaultAddress(index){
  let addresses = getSavedAddresses();
  if(!addresses[index]) return;

  addresses = addresses.map((a, i) => ({
    ...a,
    isDefault: (i === index)
  }));
  saveAddressesList(addresses);

  const selected = addresses[index];
  if(selected && LOCA.currentUser){
    try {
      const payload = {
        id: LOCA.currentUser.id,
        email: LOCA.currentUser.email || "",
        full_name: selected.name || LOCA.profile?.full_name || "",
        phone: selected.phone || LOCA.profile?.phone || "",
        address: selected.address,
        city: selected.city,
        updated_at: new Date().toISOString()
      };
      const {data, error} = await LOCA.db.from("profiles").upsert(payload).select("*").single();
      if(!error && data) {
        LOCA.profile = data;
        populateProfileForm();
      }
    } catch(err){
      console.warn("Could not sync default profile:", err);
    }
  }

  renderAddressBook();
  showAccountMessage("Default address updated.");
}

function deleteAddress(index){
  let addresses = getSavedAddresses();
  if(!addresses[index]) return;
  if(!confirm("Remove this saved address?")) return;
  addresses.splice(index, 1);
  saveAddressesList(addresses);
  renderAddressBook();
  showAccountMessage("Address removed.");
}

async function signOutCustomer(){
  try{
    await LOCA.db.auth.signOut();
    closeAccount();
  } catch(err){
    alert(err.message || "Could not sign out.");
  }
}

async function handleSession(session){
  const previousUserId = LOCA.currentUser?.id || null;
  LOCA.currentUser = session?.user || null;
  LOCA.profile = null;
  renderAccountHeader();

  if(LOCA.currentUser){
    try{
      await LOCA.ensureProfile();
      const shouldMerge = previousUserId !== LOCA.currentUser.id;
      await LOCA.loadCart({mergeGuest: shouldMerge});
    } catch(err){
      console.error("Account initialization failed:", err);
      await LOCA.loadCart();
    }
  } else {
    await LOCA.loadCart();
  }
}

async function initAuth(){
  updateAuthUI();
  const {data:{session}} = await LOCA.db.auth.getSession();
  await handleSession(session);
  LOCA.db.auth.onAuthStateChange((_event, newSession) => {
    setTimeout(() => handleSession(newSession), 0);
  });
}

window.openAuth = openAuth;
window.closeAuth = closeAuth;
window.toggleAuthMode = toggleAuthMode;
window.handleAuth = handleAuth;
window.openAccount = openAccount;
window.closeAccount = closeAccount;
window.saveProfile = saveProfile;
window.signOutCustomer = signOutCustomer;
window.initAuth = initAuth;
window.toggleAddAddressForm = toggleAddAddressForm;
window.saveNewAddress = saveNewAddress;
window.setDefaultAddress = setDefaultAddress;
window.deleteAddress = deleteAddress;
window.renderAddressBook = renderAddressBook;
LOCA.getSavedAddresses = getSavedAddresses;
LOCA.saveAddressesList = saveAddressesList;
