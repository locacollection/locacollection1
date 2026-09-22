const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');

// Test 1: Verify js/orders.js and js/auth.js parse correctly and functions are exported
const elements = {};
const node = () => ({
  addEventListener(){},
  value: '',
  checked: false,
  files: [],
  classList: { add(){}, remove(){}, contains(){ return false; } },
  style: {}
});

const storage = {};
const mockLocalStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
  get length(){ return Object.keys(storage).length; },
  key: (i) => Object.keys(storage)[i] || null
};

const context = {
  window: {},
  document: {
    getElementById: (id) => elements[id] ??= node(),
    querySelectorAll: () => [],
    addEventListener() {},
    body: { classList: { add(){}, remove(){} } }
  },
  localStorage: mockLocalStorage,
  URL,
  console,
  setTimeout: (fn) => fn(),
  LOCA: {
    money: (v) => 'PKR ' + v,
    esc: (v) => v,
    db: {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        getUser: async () => ({ data: { user: null } }),
        onAuthStateChange: () => {}
      },
      from: () => ({
        select: () => ({ single: async () => ({ data: null, error: null }), eq: () => ({ order: async () => ({ data: [] }) }) }),
        upsert: () => ({ select: () => ({ single: async () => ({ data: { id: 'user1' }, error: null }) }) })
      })
    }
  }
};
context.window = context;
vm.createContext(context);

vm.runInContext(fs.readFileSync(path.join(root, 'js/auth.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/orders.js'), 'utf8'), context);

assert.equal(typeof context.window.saveDeliveryAddress, 'function', 'saveDeliveryAddress must be exported');
assert.equal(typeof context.window.loadDeliveryAddresses, 'function', 'loadDeliveryAddresses must be exported');
assert.equal(typeof context.window.renderAddressOptions, 'function', 'renderAddressOptions must be exported');
assert.equal(typeof context.window.applySavedAddress, 'function', 'applySavedAddress must be exported');
assert.equal(typeof context.window.openCheckout, 'function', 'openCheckout must be exported');

// Test 2: Verify config.js exports LOCA.esc and LOCA.escape and checkout modal renders without error
const ctx2 = {
  window: {},
  supabase: { createClient: () => ({}) },
  localStorage: mockLocalStorage,
  document: {
    getElementById: (id) => elements[id] ??= node(),
    addEventListener() {}
  }
};
ctx2.window = ctx2;
vm.createContext(ctx2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8'), ctx2);
assert.equal(typeof ctx2.LOCA.esc, 'function', 'LOCA.esc must be defined in config.js');
assert.equal(typeof ctx2.LOCA.escape, 'function', 'LOCA.escape must be defined in config.js');
assert.equal(ctx2.LOCA.esc('<script>'), '&lt;script&gt;', 'LOCA.esc must escape special chars');

// Load orders.js into ctx2 and test the current delivery-address renderer
vm.runInContext(fs.readFileSync(path.join(root, 'js/orders.js'), 'utf8'), ctx2);
assert.doesNotThrow(() => {
  ctx2.LOCA.addresses = [];
  ctx2.window.renderAddressOptions();
}, 'renderAddressOptions should execute cleanly without LOCA.esc missing error');

console.log('PASS: user profile address management and checkout integration tests');
