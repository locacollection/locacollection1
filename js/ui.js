function toggleMenu(){
  const nav = document.querySelector(".navlinks");
  const open = nav?.classList.toggle("is-open");
  document.querySelector(".hamb")?.setAttribute("aria-expanded", String(!!open));
}

document.querySelectorAll(".navlinks a").forEach(link => link.addEventListener("click", () => {
  document.querySelector(".navlinks")?.classList.remove("is-open");
  document.querySelector(".hamb")?.setAttribute("aria-expanded", "false");
}));

function subscribe(event){
  event.preventDefault();
  const form = event.currentTarget;
  const msg = document.getElementById("msg");
  if(msg){
    msg.textContent = "You're on the LOCA list. Watch for the next drop.";
    msg.style.marginTop = "16px";
    msg.classList.add("success-message");
  }
  form?.reset();
}

function reveal(){
  document.querySelectorAll(".reveal").forEach(el => {
    if(el.dataset.revealed) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("visible");
        entry.target.dataset.revealed = "1";
        observer.disconnect();
      }
    }), {threshold:.12});
    observer.observe(el);
  });
}

function ensureSyncPill(){
  const actions = document.querySelector(".actions");
  if(!actions || document.getElementById("syncPill")) return null;
  const pill = document.createElement("span");
  pill.id = "syncPill";
  pill.className = "sync-pill";
  pill.dataset.state = "loading";
  pill.innerHTML = '<span class="sync-dot" aria-hidden="true"></span><span>Syncing catalogue</span>';
  actions.insertBefore(pill, actions.firstChild);
  return pill;
}

async function checkSupabaseConnection(){
  const pill = ensureSyncPill();
  if(!pill || !window.LOCA?.db) return;
  try{
    const {error} = await LOCA.db.from("products").select("id").limit(1);
    if(error) throw error;
    pill.dataset.state = "ready";
    pill.lastElementChild.textContent = "Catalogue connected";
  } catch(err){
    console.warn("Catalogue connection check failed", err);
    pill.dataset.state = "error";
    pill.lastElementChild.textContent = "Catalogue offline";
  }
}

window.addEventListener("mousemove", event => {
  const dot = document.getElementById("cursorDot");
  if(dot){ dot.style.left = event.clientX + "px"; dot.style.top = event.clientY + "px"; }
});

window.addEventListener("focus", () => {
  if(window.LOCA?.currentUser && window.LOCA?.loadCart) LOCA.loadCart();
});

document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "visible" && window.LOCA?.currentUser && window.LOCA?.loadCart) LOCA.loadCart();
});

document.addEventListener("DOMContentLoaded", () => {
  ensureSyncPill();
  checkSupabaseConnection();
});

window.toggleMenu = toggleMenu;
window.subscribe = subscribe;
window.reveal = reveal;
window.checkSupabaseConnection = checkSupabaseConnection;
