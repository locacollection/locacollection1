(() => {
  const db = window.LOCA?.db;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let admins = [];

  function addAdminDesk() {
    const nav = document.querySelector('.side-nav');
    const usersPanel = document.getElementById('usersSection');
    if (!nav || !usersPanel || document.getElementById('adminsTab')) return;

    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.id = 'adminsTab';
    tab.dataset.tab = 'admins';
    tab.innerHTML = '<span class="nav-icon">◎</span><span>Admins Desk</span><b id="sideAdminCount">0</b>';
    nav.appendChild(tab);

    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.id = 'adminsSection';
    panel.style.display = 'none';
    panel.innerHTML = '<div class="section-head"><div><p class="kicker">Access control</p><h2>Admins Desk</h2><p class="muted" id="adminsMessage">Administrators and studio access.</p></div><div class="toolbar-actions"><button class="btn alt" type="button" id="refreshAdmins">↻ Refresh</button></div></div><div class="tablewrap"><table><thead><tr><th>ADMIN ID</th><th>EMAIL</th><th>JOINED DATE</th><th>ACTIONS</th></tr></thead><tbody id="adminsBody"></tbody></table></div>';
    usersPanel.parentNode.insertBefore(panel, usersPanel.nextSibling);

    tab.addEventListener('click', () => {
      document.querySelectorAll('.side-nav .tab').forEach(item => item.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.shell .panel').forEach(item => { item.style.display = item === panel ? 'block' : 'none'; });
      document.getElementById('pageTitle').textContent = 'Admins Desk';
      loadAdmins();
    });
    document.getElementById('refreshAdmins').addEventListener('click', loadAdmins);
    document.querySelectorAll('.side-nav .tab:not(#adminsTab)').forEach(item => item.addEventListener('click', () => { panel.style.display = 'none'; }));
    document.getElementById('adminsBody').addEventListener('click', event => {
      const button = event.target.closest('[data-delete-admin]');
      if (button) deleteAdmin(button.dataset.deleteAdmin, button);
    });
  }

  async function loadAdmins() {
    const body = document.getElementById('adminsBody');
    if (!body || !db) return;
    body.innerHTML = '<tr><td colspan="4" class="empty">Loading administrators...</td></tr>';
    try {
      const { data, error } = await db.from('profiles').select('*').eq('role', 'admin').order('created_at', { ascending: true });
      if (error) throw error;
      admins = data || [];
      renderAdmins();
    } catch (error) {
      body.innerHTML = `<tr><td colspan="4" class="empty">${esc(error.message || 'Could not load administrators.')}</td></tr>`;
      window.adminNotify?.(error.message || 'Could not load administrators.', { title: 'Admins Desk unavailable', tone: 'error' });
    }
  }

  function renderAdmins() {
    const body = document.getElementById('adminsBody');
    if (!body) return;
    body.innerHTML = admins.length ? admins.map((admin, index) => {
      const identifier = admin.admin_identifier || `ADMIN_LOCA${index + 1}`;
      return `<tr><td><b>${esc(identifier)}</b></td><td>${esc(admin.email || 'No email')}</td><td>${admin.created_at ? new Date(admin.created_at).toLocaleDateString('en-PK') : '-'}</td><td><button class="smallbtn danger-action" type="button" data-delete-admin="${esc(admin.id)}">Delete</button></td></tr>`;
    }).join('') : '<tr><td colspan="4" class="empty">No administrator profiles found.</td></tr>';
    const message = document.getElementById('adminsMessage');
    if (message) message.textContent = `${admins.length} administrator${admins.length === 1 ? '' : 's'} · identifiers are resequenced automatically`;
    const count = document.getElementById('sideAdminCount');
    if (count) count.textContent = admins.length;
  }

  async function deleteAdmin(id, button) {
    const admin = admins.find(item => String(item.id) === String(id));
    if (!admin || !(await window.confirmAction?.({ title: `Delete ${admin.admin_identifier || admin.email || 'administrator'}?`, message: 'This removes the administrator login and profile.', confirmLabel: 'Delete admin' }))) return;
    button.disabled = true;
    try {
      const { data: sessionData, error: sessionError } = await db.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) throw sessionError || new Error('Your admin session has expired.');
      const result = await db.functions.invoke('admin-delete-user', { body: { user_id: admin.id }, headers: { Authorization: `Bearer ${sessionData.session.access_token}` } });
      if (result.error) throw result.error;
      const { error } = await db.rpc('resequence_admin_identifiers');
      if (error) throw error;
      await loadAdmins();
      window.adminNotify?.('Administrator removed and identifiers resequenced.', { title: 'Admins Desk updated' });
    } catch (error) {
      button.disabled = false;
      window.adminNotify?.(error.message || 'The administrator could not be deleted.', { title: 'Delete failed', tone: 'error' });
    }
  }

  function addTestModeControl() {
    const target = document.querySelector('.topright');
    if (!target || document.getElementById('testModeBtn')) return;
    const button = document.createElement('button');
    button.className = 'btn alt';
    button.id = 'testModeBtn';
    button.type = 'button';
    button.textContent = localStorage.getItem('loca_admin_test_mode') === 'true' ? 'Exit Test Mode' : 'Switch to Test Mode';
    button.addEventListener('click', async () => {
      const enabled = localStorage.getItem('loca_admin_test_mode') === 'true';
      const { data: { session } = {} } = await db.auth.getSession();
      if (!session?.user) return;
      const next = !enabled;
      const { error } = await db.from('profiles').update({ is_test_mode: next }).eq('id', session.user.id);
      if (error) return window.adminNotify?.(error.message, { title: 'Test Mode unavailable', tone: 'error' });
      localStorage.setItem('loca_admin_test_mode', String(next));
      button.textContent = next ? 'Exit Test Mode' : 'Switch to Test Mode';
      window.open('index.html', '_blank', 'noopener');
    });
    target.insertBefore(button, target.firstChild);
  }

  const init = () => {
    addAdminDesk();
    addTestModeControl();
    window.loadAdmins = loadAdmins;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
