document.addEventListener("DOMContentLoaded", async () => {
  try{
    await loadProducts();
    await initAuth();
  } catch(err){
    console.error("LOCA initialization failed:", err);
  }
});
