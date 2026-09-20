window.LOCA = window.LOCA || {};

LOCA.esc = LOCA.escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
LOCA.money = n => "PKR " + Number(n || 0).toLocaleString("en-PK");

LOCA.SUPABASE_URL = "https://qvvrjogeqranowfseivh.supabase.co";
LOCA.SUPABASE_KEY = "sb_publishable_IP9PzAVXsVwcqNWenmdmLg_ACtzSDMB";
LOCA.db = supabase.createClient(LOCA.SUPABASE_URL, LOCA.SUPABASE_KEY);
LOCA.currentUser = null;
LOCA.profile = null;
LOCA.products = [];
LOCA.cart = {};
LOCA.authMode = "signin";
LOCA.cartSyncBusy = false;
