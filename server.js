import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const DEFAULT_SUPABASE_URL = "https://qvvrjogeqranowfseivh.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_IP9PzAVXsVwcqNWenmdmLg_ACtzSDMB";

function getSupabaseConfig() {
  let url = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  // Strip trailing /rest/v1 or trailing slashes if copied from the Data API endpoint
  url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  return {
    supabaseUrl: url,
    supabaseKey: (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || DEFAULT_SUPABASE_KEY).trim()
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Supabase config endpoint
app.get('/api/config', (req, res) => {
  res.json(getSupabaseConfig());
});

// Supabase status & verification endpoint
app.get('/api/supabase/status', async (req, res) => {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
    if (error) throw error;
    res.json({
      status: 'connected',
      connected: true,
      url: supabaseUrl,
      productsCount: count
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      connected: false,
      message: err.message,
      url: supabaseUrl
    });
  }
});

// Dynamic config.js to supply environment variables if configured
app.get('/js/config.js', (req, res) => {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  res.type('application/javascript');
  res.send(`window.LOCA = window.LOCA || {};

LOCA.SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
LOCA.SUPABASE_KEY = ${JSON.stringify(supabaseKey)};
LOCA.db = supabase.createClient(LOCA.SUPABASE_URL, LOCA.SUPABASE_KEY);
LOCA.currentUser = null;
LOCA.profile = null;
LOCA.products = [];
LOCA.cart = {};
LOCA.authMode = "signin";
LOCA.cartSyncBusy = false;
`);
});

// Route for admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve static assets from root directory
app.use(express.static(__dirname));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
