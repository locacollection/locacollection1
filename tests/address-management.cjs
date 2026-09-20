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

assert.equal(typeof context.window.saveNewAddress, 'function', 'saveNewAddress must be exported');
assert.equal(typeof context.window.setDefaultAddress, 'function', 'setDefaultAddress must be exported');
assert.equal(typeof context.window.deleteAddress, 'function', 'deleteAddress must be exported');
assert.equal(typeof context.window.selectCheckoutAddress, 'function', 'selectCheckoutAddress must be exported');

// Test address book logic
context.LOCA.currentUser = { id: 'cust_test_1', email: 'test@loca.pk' };
context.LOCA.saveAddressesList([
  { id: 'addr_1', title: 'Office', name: 'Zainab', phone: '03001234567', city: 'Lahore', address: 'Gulberg III', isDefault: false },
  { id: 'addr_2', title: 'Home', name: 'Zainab Home', phone: '03001234567', city: 'Lahore', address: 'DHA Phase 5', isDefault: true }
]);

const addresses = context.LOCA.getSavedAddresses();
assert.equal(addresses.length, 2);
assert.equal(addresses[1].isDefault, true);

console.log('PASS: user profile address management and checkout integration tests');
