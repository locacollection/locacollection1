window.LOCA = window.LOCA || {};

LOCA.SUPABASE_URL = "https://qvvrjogeqranowfseivh.supabase.co";
LOCA.SUPABASE_KEY = "sb_publishable_IP9PzAVXsVwcqNWenmdmLg_ACtzSDMB";
LOCA.db = supabase.createClient(LOCA.SUPABASE_URL, LOCA.SUPABASE_KEY);
LOCA.currentUser = null;
LOCA.profile = null;
LOCA.products = [];
LOCA.cart = {};
LOCA.authMode = "signin";
LOCA.cartSyncBusy = false;
