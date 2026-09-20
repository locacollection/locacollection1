function toggleMenu(){
  const n = document.querySelector(".navlinks");
  if(!n) return;
  n.style.display = n.style.display === "flex" ? "none" : "flex";
  n.style.position = "absolute";
  n.style.top = "68px";
  n.style.left = "0";
  n.style.right = "0";
  n.style.background = "var(--paper)";
  n.style.padding = "20px 25px";
  n.style.flexDirection = "column";
  n.style.borderBottom = "1px solid var(--line)";
}

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
