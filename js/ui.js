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
  const msg = document.getElementById("msg");
  if(msg){
    msg.textContent = "Thank you — you're on the LOCA list.";
    msg.style.marginTop = "16px";
  }
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

window.addEventListener("mousemove", event => {
  const dot = document.getElementById("cursorDot");
  if(dot){
    dot.style.left = event.clientX + "px";
    dot.style.top = event.clientY + "px";
  }
});

window.addEventListener("focus", () => {
  if(window.LOCA?.currentUser && window.LOCA?.loadCart) LOCA.loadCart();
});

document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "visible" && window.LOCA?.currentUser && window.LOCA?.loadCart) LOCA.loadCart();
});

window.toggleMenu = toggleMenu;
window.subscribe = subscribe;
window.reveal = reveal;

