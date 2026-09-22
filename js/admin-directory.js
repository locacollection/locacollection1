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
    panel.innerHTML = '<div class="section-head"><div><p class="kicker">Access control</p><h2>Admins Desk</h2><p class="muted" id="adminsMessage">Administrators and studio access.</p></div><div class="toolbar-actions"><button class="btn btn-primary" type="button" id="addAdmin">＋ Add admin</button><button class="btn alt" type="button" id="refreshAdmins">↻ Refresh</button></div></div><form id="addAdminForm" class="admin-create-form" hidden><div class="field"><label for="newAdminName">Full name</label><input id="newAdminName" required maxlength="120"></div><div class="field"><label for="newAdminEmail">Admin email</label><input id="newAdminEmail" type="email" required autocomplete="off"></div><div class="field"><label for="newAdminPassword">Temporary password</label><input id="newAdminPassword" type="password" required minlength="8" autocomplete="new-password"><small>Share this securely and ask the administrator to change it after first sign-in.</small></div><div class="admin-create-actions"><button class="btn btn-primary" type="submit">Create admin</button><button class="btn alt" type="button" id="cancelAddAdmin">Cancel</button></div><p id="addAdminMessage" role="status"></p></form><div class="tablewrap"><table><thead><tr><th>ADMIN ID</th><th>EMAIL</th><th>JOINED DATE</th><th>ACTIONS</th></tr></thead><tbody id="adminsBody"></tbody></table></div>';
    usersPanel.parentNode.insertBefore(panel, usersPanel.nextSibling);

    tab.addEventListener('click', () => {
      document.querySelectorAll('.side-nav .tab').forEach(item => item.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.shell .panel').forEach(item => { item.style.display = item === panel ? 'block' : 'none'; });
      document.getElementById('pageTitle').textContent = 'Admins Desk';
      loadAdmins();
    });
    document.getElementById('refreshAdmins').addEventListener('click', loadAdmins);
    document.getElementById('addAdmin').addEventListener('click', () => { document.getElementById('addAdminForm').hidden = false; document.getElementById('newAdminName').focus(); });
    document.getElementById('cancelAddAdmin').addEventListener('click', () => { document.getElementById('addAdminForm').hidden = true; });
    document.getElementById('addAdminForm').addEventListener('submit', createAdmin);
    document.querySelectorAll('.side-nav .tab:not(#adminsTab)').forEach(item => item.addEventListener('click', () => { panel.style.display = 'none'; }));
    document.getElementById('adminsBody').addEventListener('click', event => {
      const button = event.target.closest('[data-delete-admin]');
      if (button) deleteAdmin(button.dataset.deleteAdmin, button);
    });
  }

  async function createAdmin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const message = document.getElementById('addAdminMessage');
    button.disabled = true;
    button.textContent = 'Creating...';
    message.textContent = '';
    try {
      const { data: sessionData, error: sessionError } = await db.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) throw sessionError || new Error('Your admin session has expired.');
      const { data, error } = await db.functions.invoke('admin-create-user', {
        body: { email: document.getElementById('newAdminEmail').value.trim(), password: document.getElementById('newAdminPassword').value, full_name: document.getElementById('newAdminName').value.trim() },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      form.reset();
      form.hidden = true;
      await loadAdmins();
      window.adminNotify?.(`${data.profile?.admin_identifier || 'New admin'} was created successfully.`, { title: 'Admin account created' });
    } catch (error) {
      message.textContent = error.message || 'The admin account could not be created.';
      window.adminNotify?.(message.textContent, { title: 'Admin creation failed', tone: 'error' });
    } finally {
      button.disabled = false;
      button.textContent = 'Create admin';
    }
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

  const init = () => {
    addAdminDesk();
    window.loadAdmins = loadAdmins;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
