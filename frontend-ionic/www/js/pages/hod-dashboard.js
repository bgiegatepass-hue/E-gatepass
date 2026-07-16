// =====================================================================
// E-PASS — HOD Dashboard (Home / Requests tabs) with a hand-rolled SVG
// donut chart for the department overview (no external chart lib needed).
// =====================================================================

Pages['hod-dashboard'] = {
  _activeTab: 'home',
  _requestsFilter: 'Pending',
  _requestsView: 'student',
  _memberRole: 'STUDENT',
  _searchTerm: '',
  _departmentFilter: '',
  _collegeFilter: '',
  _membersById: {},

  render() {
    this._activeTab = 'home';
    return `
      <ion-header><ion-toolbar>
        <ion-buttons slot="start">
          <img src="assets/images/logo.png" alt="Bansal Group of Institutes" style="height:30px;width:auto;object-fit:contain;" onerror="this.style.display='none'" />
        </ion-buttons>
        <ion-title id="hod-dash-title">HOD Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button id="hod-notif-btn" style="--color:var(--bgi-primary);margin-right:6px;"><ion-icon name="notifications-outline" slot="icon-only" style="font-size:20px;"></ion-icon></ion-button>
          <ion-button id="hod-logout-btn"><ion-icon name="log-out-outline" slot="icon-only"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content fullscreen><div id="hod-dash-body" class="ion-padding"></div></ion-content>
      <ion-tab-bar id="hod-tabbar">
        <ion-tab-button data-tab="home" class="active"><ion-icon name="home-outline"></ion-icon><ion-label>Home</ion-label></ion-tab-button>
        <ion-tab-button data-tab="members"><ion-icon name="people-outline"></ion-icon><ion-label>Members</ion-label></ion-tab-button>
        <ion-tab-button data-tab="requests"><ion-icon name="document-text-outline"></ion-icon><ion-label>Requests</ion-label></ion-tab-button>
        <ion-tab-button data-tab="profile"><ion-icon name="person-circle-outline"></ion-icon><ion-label>Profile</ion-label></ion-tab-button>
      </ion-tab-bar>
    `;
  },

  _memberMenuTile(icon, label, role, color) {
    return `
      <ion-card class="hod-member-menu-tile" data-role="${role}" style="margin:0;padding:14px;text-align:center;cursor:pointer;">
        <ion-icon name="${icon}" style="font-size:26px;color:${color};margin-bottom:6px;display:block;"></ion-icon>
        <div style="font-weight:700;font-size:12px;">${label}</div>
        <div style="font-size:10px;color:var(--bgi-text-secondary);margin-top:2px;">Manage ${label}</div>
      </ion-card>`;
  },

  afterRender() {
    document.getElementById('hod-logout-btn').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      Auth.logout();
    });
    document.getElementById('hod-notif-btn')?.addEventListener('click', () => {
      // Open the shared notifications modal in full-screen (reuse admin dashboard loader)
      if (Pages['admin-dashboard'] && typeof Pages['admin-dashboard']._loadNotifications === 'function') {
        Pages['admin-dashboard']._loadNotifications();
      } else {
        Router.navigate('notifications');
      }
    });
    document.querySelectorAll('#hod-tabbar ion-tab-button').forEach((btn) => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });
    this._switchTab('home');
  },

  async _loadMembers(selectedRole) {
    // If no specific role requested, show the role tiles (Director-like) for HOD but without HOD tile
    const body = document.getElementById('hod-dash-body');
    if (!selectedRole) {
      body.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${this._memberMenuTile('people-outline', 'Students', 'STUDENT', '#6366f1')}
          ${this._memberMenuTile('school-outline', 'Faculty', 'FACULTY', '#0ea5e9')}
          ${this._memberMenuTile('shield-outline', 'Guards', 'GUARD', '#10b981')}
        </div>
      `;
      body.querySelectorAll('.hod-member-menu-tile').forEach((tile) => tile.addEventListener('click', () => this._loadMembers(tile.dataset.role)));
      return;
    }

    // Otherwise render the existing members list view for the selected role
    this._memberRole = selectedRole;
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <ion-button fill="clear" size="small" id="hod-back-to-members-btn"><ion-icon name="arrow-back-outline" slot="icon-only" style="font-size:18px;"></ion-icon></ion-button>
        <h2 style="margin:0;font-size:15px;font-weight:700;">${this._memberRole === 'STUDENT' ? 'Students' : this._memberRole === 'FACULTY' ? 'Faculty' : 'Guards'}</h2>
        ${this._memberRole !== 'HOD' ? `
        <ion-button size="small" id="hod-add-member-top-btn" style="margin-left:auto;font-size:12px;">
          <ion-icon name="add" slot="start" style="font-size:14px;"></ion-icon>Add
        </ion-button>` : ''}
      </div>

      ${this._memberRole === 'STUDENT' ? `
      <!-- Student List Upload Card -->
      <ion-card style="margin-bottom:10px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;">
        <div style="padding:12px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <ion-icon name="cloud-upload-outline" style="font-size:22px;"></ion-icon>
            <div>
              <div style="font-weight:700;font-size:13px;">Import Student List</div>
              <div style="font-size:11px;opacity:0.9;">Upload Excel with student details</div>
            </div>
          </div>
          <div style="margin-top:8px;">
            <ion-button expand="block" size="small" color="light" id="hod-student-upload-btn" style="font-size:12px;">
              <ion-icon name="document-attach-outline" slot="start" style="font-size:14px;"></ion-icon>Browse File
            </ion-button>
          </div>
          <input type="file" id="hod-student-upload-input" accept=".xlsx,.xls,.csv" style="display:none;" />
        </div>
      </ion-card>
      ` : ''}

      <!-- Search & Filters -->
      <ion-item lines="none" style="border:1px solid var(--bgi-border);border-radius:10px;--min-height:38px;margin-bottom:8px;">
        <ion-icon name="search-outline" slot="start" color="medium" style="font-size:16px;"></ion-icon>
        <ion-input id="hod-member-search" placeholder="Search name, email, roll..." style="font-size:13px;"></ion-input>
      </ion-item>

      <ion-item lines="none" style="border:1px solid var(--bgi-border);border-radius:10px;--min-height:38px;margin-bottom:8px;">
        <ion-icon name="business-outline" slot="start" color="medium" style="font-size:16px;"></ion-icon>
        <ion-select id="hod-member-college-select" interface="action-sheet" placeholder="All Colleges" style="font-size:13px;">
          <ion-select-option value="">All Colleges</ion-select-option>
          ${APP_CONFIG.campuses.map((c) => `<ion-select-option value="${UI.escapeHtml(c.code)}">${UI.escapeHtml(c.label)}</ion-select-option>`).join('')}
        </ion-select>
      </ion-item>

      <ion-item lines="none" style="border:1px solid var(--bgi-border);border-radius:10px;--min-height:38px;margin-bottom:10px;">
        <ion-icon name="layers-outline" slot="start" color="medium" style="font-size:16px;"></ion-icon>
        <ion-select id="hod-member-department-select" interface="action-sheet" placeholder="All Departments" style="font-size:13px;">
          <ion-select-option value="">All Departments</ion-select-option>
        </ion-select>
      </ion-item>

      <!-- Pending Banners for role-specific views -->
      ${this._memberRole === 'FACULTY' ? `
      <ion-card id="hod-faculty-pending-banner" style="margin:0 0 10px;border-left:3px solid var(--bgi-warning);cursor:pointer;">
        <div style="padding:10px 12px;display:flex;align-items:center;gap:8px;">
          <ion-icon name="time-outline" style="font-size:18px;color:var(--bgi-warning);flex-shrink:0;"></ion-icon>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:13px;">Pending Faculty Approvals</div>
            <div id="hod-faculty-pending-count" style="font-size:11px;color:var(--bgi-text-secondary);">Checking...</div>
          </div>
          <ion-icon name="chevron-forward-outline" style="font-size:16px;color:var(--bgi-text-secondary);"></ion-icon>
        </div>
      </ion-card>` : ''}

      ${this._memberRole === 'GUARD' ? `
      <ion-card id="hod-guard-pending-banner" style="margin:0 0 10px;border-left:3px solid var(--bgi-warning);cursor:pointer;">
        <div style="padding:10px 12px;display:flex;align-items:center;gap:8px;">
          <ion-icon name="time-outline" style="font-size:18px;color:var(--bgi-warning);flex-shrink:0;"></ion-icon>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:13px;">Pending Guard Approvals</div>
            <div id="hod-guard-pending-count" style="font-size:11px;color:var(--bgi-text-secondary);">Checking...</div>
          </div>
          <ion-icon name="chevron-forward-outline" style="font-size:16px;color:var(--bgi-text-secondary);"></ion-icon>
        </div>
      </ion-card>` : ''}

      <div id="hod-members-list" style="margin-top:4px;"></div>
    `;

    // Back button
    document.getElementById('hod-back-to-members-btn').addEventListener('click', () => this._loadMembers());
    document.getElementById('hod-add-member-top-btn')?.addEventListener('click', () => this._goToAddMember(this._memberRole));
    document.getElementById('hod-faculty-pending-banner')?.addEventListener('click', () => this._showPendingFacultyApprovals());
    document.getElementById('hod-guard-pending-banner')?.addEventListener('click', () => this._showPendingGuardApprovals());

    // Student List Upload handlers (only for STUDENT role)
    if (this._memberRole === 'STUDENT') {
      const uploadBtn = document.getElementById('hod-student-upload-btn');
      const uploadInput = document.getElementById('hod-student-upload-input');
      
      if (uploadBtn && uploadInput) {
        uploadBtn.addEventListener('click', () => uploadInput.click());
        uploadInput.addEventListener('change', (e) => this._handleStudentListUpload(e));
      }
    }

    document.getElementById('hod-member-search').addEventListener('ionInput', (e) => {
      clearTimeout(this._memberSearchDebounce);
      this._memberSearchDebounce = setTimeout(() => {
        this._searchTerm = e.detail.value;
        this._renderMembersList();
      }, 300);
    });

    document.getElementById('hod-member-college-select')?.addEventListener('ionChange', (e) => {
      this._collegeFilter = e.detail.value;
      this._renderMembersList();
    });

    const deptSel = document.getElementById('hod-member-department-select');
    if (deptSel) {
      deptSel.addEventListener('ionChange', (e) => { this._departmentFilter = e.detail.value; this._renderMembersList(); });
    }

    await Promise.all([
      this._refreshFacultyPendingCount(),
      this._refreshGuardPendingCount(),
      this._renderMembersList(),
      this._loadDepartmentOptions(),
    ]);
  },

  async _refreshFacultyPendingCount() {
    const el = document.getElementById('hod-faculty-pending-count');
    if (!el) return;
    try {
      const res = await Api.get('/hod/faculty/pending');
      const list = res.data || [];
      const text = list.length
        ? `${list.length} request${list.length > 1 ? 's' : ''} awaiting approval`
        : 'No pending requests';
      el.textContent = text;
      const homeEl = document.getElementById('hod-home-faculty-pending-count');
      if (homeEl) homeEl.textContent = text;
    } catch (e) {
      el.textContent = 'Unable to load';
    }
  },

  async _showPendingFacultyApprovals() {
    const modal = document.createElement('ion-modal');
    const self = this;
    modal.innerHTML = `
      <ion-header><ion-toolbar>
        <ion-title style="font-size:15px;">Pending Faculty Approvals</ion-title>
        <ion-buttons slot="end"><ion-button id="hod-facp-close" style="font-size:13px;">Close</ion-button></ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content class="ion-padding"><div id="hod-facp-list">${this._spinner()}</div></ion-content>
    `;
    document.body.appendChild(modal);
    await modal.present();
    modal.querySelector('#hod-facp-close').addEventListener('click', () => modal.dismiss());

    const loadList = async () => {
      const list = modal.querySelector('#hod-facp-list');
      list.innerHTML = self._spinner();
      try {
        const res = await Api.get('/hod/faculty/pending');
        if (!res || typeof res !== 'object') {
          list.innerHTML = '<p class="empty-state" style="font-size:12px;">Invalid server response</p>';
          return;
        }
        const items = res.data || [];
        if (!Array.isArray(items)) {
          list.innerHTML = '<p class="empty-state" style="font-size:12px;">Invalid data format</p>';
          return;
        }
        if (!items.length) { list.innerHTML = '<p class="empty-state" style="font-size:12px;">No pending Faculty requests</p>'; return; }
        list.innerHTML = items.map((f) => self._hodFacultyPendingCardHtml(f)).join('');
        list.querySelectorAll('.hod-facp-approve-btn').forEach((btn) => btn.addEventListener('click', () => decide(btn.dataset.id, true)));
        list.querySelectorAll('.hod-facp-reject-btn').forEach((btn) => btn.addEventListener('click', () => decide(btn.dataset.id, false)));
      } catch (e) {
        list.innerHTML = `<p class="empty-state" style="font-size:12px;">${UI.escapeHtml(e.message)}</p>`;
      }
    };

    const decide = async (id, approve) => {
      if (approve) {
        try {
          await Api.put(`/hod/faculty/${id}/approve`, {});
          UI.toast('Faculty approved — they can now log in', 'success');
          await loadList();
          self._refreshFacultyPendingCount();
        } catch (e) { UI.toast(e.message || 'Failed', 'danger'); }
        return;
      }
      const { confirmed, remark } = await UI.confirmWithRemark({
        title: 'Reject Faculty Request?',
        placeholder: 'Reason for rejection (optional)',
        confirmText: 'Reject & Delete',
        confirmColor: 'danger',
      });
      if (!confirmed) return;
      try {
        await Api.put(`/hod/faculty/${id}/reject`, { remark });
        UI.toast('Faculty request rejected and removed');
        await loadList();
        self._refreshFacultyPendingCount();
      } catch (e) { UI.toast(e.message || 'Failed', 'danger'); }
    };

    loadList();
  },

  _hodFacultyPendingCardHtml(f) {
    if (!f || typeof f !== 'object') return '';
    const id = f._id || f.id || '';
    const name = f.name ? UI.escapeHtml(String(f.name)) : '(No name)';
    const email = f.email ? UI.escapeHtml(String(f.email)) : '(No email)';
    const empId = f.employeeId ? UI.escapeHtml(String(f.employeeId)) : '-';
    const dept = f.department ? UI.escapeHtml(String(f.department)) : '-';
    const designation = f.designation ? UI.escapeHtml(String(f.designation)) : '-';
    const phone = f.phone ? UI.escapeHtml(String(f.phone)) : '-';
    return `
      <ion-card style="margin-bottom:8px;border-left:3px solid var(--bgi-warning);">
        <div style="padding:10px 12px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:4px;">
            <div>
              <div style="font-weight:700;font-size:13px;">${name}</div>
              <div style="font-size:11px;color:var(--bgi-text-secondary);">${email}</div>
            </div>
            <span class="status-badge status-pending" style="font-size:9px;padding:2px 6px;">PENDING</span>
          </div>
          <div style="font-size:11px;color:var(--bgi-text-secondary);"><b>Emp ID:</b> ${empId} &bull; <b>Dept:</b> ${dept}</div>
          <div style="font-size:11px;color:var(--bgi-text-secondary);"><b>Designation:</b> ${designation}</div>
          <div style="font-size:11px;color:var(--bgi-text-secondary);"><b>Phone:</b> ${phone}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
            <ion-button expand="block" size="small" color="success" class="hod-facp-approve-btn" data-id="${id}" style="font-size:12px;"><ion-icon name="checkmark-outline" slot="start"></ion-icon>Approve</ion-button>
            <ion-button expand="block" size="small" color="danger" class="hod-facp-reject-btn" data-id="${id}" style="font-size:12px;"><ion-icon name="close-outline" slot="start"></ion-icon>Reject</ion-button>
          </div>
        </div>
      </ion-card>`;
  },

  async _refreshGuardPendingCount() {
    const el = document.getElementById('hod-guard-pending-count');
    if (!el) return;
    try {
      const res = await Api.get('/hod/guards/pending');
      const list = res.data || [];
      const text = list.length
        ? `${list.length} request${list.length > 1 ? 's' : ''} awaiting approval`
        : 'No pending requests';
      el.textContent = text;
      const homeEl = document.getElementById('hod-home-guard-pending-count');
      if (homeEl) homeEl.textContent = text;
    } catch (e) {
      el.textContent = 'Unable to load';
    }
  },

  async _loadDepartmentOptions() {
    try {
      const sel = document.getElementById('hod-member-department-select');
      if (!sel) return;
      const res = await Api.get('/hod/members', { role: this._memberRole, limit: 200 });
      const members = (res.data || []);
      const depts = [...new Set(members.map((m) => (m.department || '').trim()).filter(Boolean))].sort();
      Array.from(sel.querySelectorAll('ion-select-option')).forEach((o) => {
        if (o.value) o.remove();
      });
      depts.forEach((d) => {
        const opt = document.createElement('ion-select-option');
        opt.value = d; opt.textContent = d;
        sel.appendChild(opt);
      });
    } catch (_) {}
  },

  async _showPendingGuardApprovals() {
    const modal = document.createElement('ion-modal');
    const self = this;
    modal.innerHTML = `
      <ion-header><ion-toolbar>
        <ion-title style="font-size:15px;">Pending Guard Approvals</ion-title>
        <ion-buttons slot="end"><ion-button id="hod-guardp-close" style="font-size:13px;">Close</ion-button></ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content class="ion-padding"><div id="hod-guardp-list">${this._spinner()}</div></ion-content>
    `;
    document.body.appendChild(modal);
    await modal.present();
    modal.querySelector('#hod-guardp-close').addEventListener('click', () => modal.dismiss());

    const loadList = async () => {
      const list = modal.querySelector('#hod-guardp-list');
      list.innerHTML = self._spinner();
      try {
        const res = await Api.get('/hod/guards/pending');
        if (!res || typeof res !== 'object') {
          list.innerHTML = '<p class="empty-state" style="font-size:12px;">Invalid server response</p>';
          return;
        }
        const items = res.data || [];
        if (!Array.isArray(items)) {
          list.innerHTML = '<p class="empty-state" style="font-size:12px;">Invalid data format</p>';
          return;
        }
        if (!items.length) { list.innerHTML = '<p class="empty-state" style="font-size:12px;">No pending Guard requests</p>'; return; }
        list.innerHTML = items.map((g) => self._hodGuardPendingCardHtml(g)).join('');
        list.querySelectorAll('.hod-guardp-approve-btn').forEach((btn) => btn.addEventListener('click', () => decide(btn.dataset.id, true)));
        list.querySelectorAll('.hod-guardp-reject-btn').forEach((btn) => btn.addEventListener('click', () => decide(btn.dataset.id, false)));
      } catch (e) {
        list.innerHTML = `<p class="empty-state" style="font-size:12px;">${UI.escapeHtml(e.message)}</p>`;
      }
    };

    const decide = async (id, approve) => {
      if (approve) {
        try {
          await Api.put(`/hod/guards/${id}/approve`, {});
          UI.toast('Guard approved — they can now log in', 'success');
          await loadList();
          self._refreshGuardPendingCount();
        } catch (e) { UI.toast(e.message || 'Failed', 'danger'); }
        return;
      }
      const { confirmed, remark } = await UI.confirmWithRemark({
        title: 'Reject Guard Request?',
        placeholder: 'Reason for rejection (optional)',
        confirmText: 'Reject & Delete',
        confirmColor: 'danger',
      });
      if (!confirmed) return;
      try {
        await Api.put(`/hod/guards/${id}/reject`, { remark });
        UI.toast('Guard request rejected and removed');
        await loadList();
        self._refreshGuardPendingCount();
      } catch (e) { UI.toast(e.message || 'Failed', 'danger'); }
    };

    loadList();
  },

  _hodGuardPendingCardHtml(g) {
    if (!g || typeof g !== 'object') return '';
    const id = g._id || g.id || '';
    const name = g.name ? UI.escapeHtml(String(g.name)) : '(No name)';
    const email = g.email ? UI.escapeHtml(String(g.email)) : '(No email)';
    const empId = g.employeeId ? UI.escapeHtml(String(g.employeeId)) : '-';
    const gate = g.assignedGate ? UI.escapeHtml(String(g.assignedGate)) : '-';
    const phone = g.phone ? UI.escapeHtml(String(g.phone)) : '-';
    return `
      <ion-card style="margin-bottom:8px;border-left:3px solid var(--bgi-warning);">
        <div style="padding:10px 12px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:4px;">
            <div>
              <div style="font-weight:700;font-size:13px;">${name}</div>
              <div style="font-size:11px;color:var(--bgi-text-secondary);">${email}</div>
            </div>
            <span class="status-badge status-pending" style="font-size:9px;padding:2px 6px;">PENDING</span>
          </div>
          <div style="font-size:11px;color:var(--bgi-text-secondary);"><b>Emp ID:</b> ${empId} &bull; <b>Gate:</b> ${gate}</div>
          <div style="font-size:11px;color:var(--bgi-text-secondary);"><b>Phone:</b> ${phone}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
            <ion-button expand="block" size="small" color="success" class="hod-guardp-approve-btn" data-id="${id}" style="font-size:12px;"><ion-icon name="checkmark-outline" slot="start"></ion-icon>Approve</ion-button>
            <ion-button expand="block" size="small" color="danger" class="hod-guardp-reject-btn" data-id="${id}" style="font-size:12px;"><ion-icon name="close-outline" slot="start"></ion-icon>Reject</ion-button>
          </div>
        </div>
      </ion-card>`;
  },

  async _renderMembersList() {
    const list = document.getElementById('hod-members-list');
    if (!list) return;
    list.innerHTML = `<div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div>`;
    try {
      const res = await Api.get('/hod/members', {
        role: this._memberRole,
        search: this._searchTerm || undefined,
        college: this._collegeFilter || undefined,
        department: this._memberRole === 'GUARD' ? undefined : this._departmentFilter || undefined,
      });
      const members = res.data || [];
      this._membersById = members.reduce((acc, member) => {
        acc[member._id] = member;
        return acc;
      }, {});
      if (!members.length) {
        list.innerHTML = `<p class="empty-state">No ${this._memberRole.toLowerCase()}s found</p>`;
        return;
      }
      list.innerHTML = members.map((m) => this._memberCardHtml(m)).join('');
      list.querySelectorAll('.hod-member-card').forEach((card) => {
        card.addEventListener('click', () => this._showMemberDetail(card.dataset.memberId));
      });
    } catch (e) {
      list.innerHTML = `<p class="empty-state">${UI.escapeHtml(e.message)}</p>`;
    }
  },

  _memberCardHtml(m) {
    const roleLabel = m.role === 'STUDENT'
      ? `Roll: ${UI.escapeHtml(m.rollNumber || '-')} · ${UI.escapeHtml(m.branch || '-')} Sem ${m.semester || '-'}`
      : m.role === 'FACULTY'
        ? UI.escapeHtml(m.designation || 'Faculty')
        : `Gate: ${UI.escapeHtml(m.assignedGate || '-')}`;
    return `
      <ion-card class="hod-member-card" data-member-id="${UI.escapeHtml(m._id)}" style="margin-bottom:8px;cursor:pointer;">
        <div style="padding:12px;display:flex;gap:10px;align-items:center;">
          <div style="width:44px;height:44px;border-radius:50%;background:var(--bgi-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <ion-icon name="person-circle-outline" style="font-size:24px;color:var(--bgi-primary);"></ion-icon>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-weight:700;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escapeHtml(m.name)}</span>
              <span class="status-badge ${m.isActive ? 'status-approved' : 'status-rejected'}" style="font-size:9px;padding:2px 6px;">${m.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div style="font-size:11px;color:var(--bgi-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escapeHtml(m.email)}</div>
            <div style="font-size:11px;color:var(--bgi-text-secondary);margin-top:4px;">${roleLabel}</div>
            <div style="font-size:10px;color:var(--bgi-text-secondary);margin-top:6px;display:flex;justify-content:space-between;align-items:center;">
              <span>Dept: ${UI.escapeHtml(m.department || '-')}</span>
              <span style="font-size:11px;color:var(--bgi-primary);font-weight:700;">View Profile</span>
            </div>
          </div>
        </div>
      </ion-card>`;
  },

  _switchTab(tab) {
    this._activeTab = tab;
    document.querySelectorAll('#hod-tabbar ion-tab-button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const titles = {
      home: 'HOD Dashboard',
      members: 'HOD Members',
      profile: 'My Profile',
      requests: 'HOD - All Requests',
    };
    document.getElementById('hod-dash-title').textContent = titles[tab] || 'HOD Dashboard';
    if (tab === 'home') this._loadHome();
    else if (tab === 'members') this._loadMembers();
    else if (tab === 'requests') this._loadRequests();
    else if (tab === 'profile') this._loadProfile();
  },

  async _loadProfile() {
    const body = document.getElementById('hod-dash-body');
    body.innerHTML = `<div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div>`;
    try {
      const user = await Auth.fetchProfile();
      const photoUrl = user.profileImageUrl || '';
      const profileRows = [
        ['Role', 'HOD'],
        ['Name', user.name || '-'],
        ['Phone', user.phone || '-'],
        ['Email', user.email || '-'],
        ['Campus', user.campus || '-'],
        ['College', user.college || '-'],
        ['Department', user.department || '-'],
        ['Employee ID', user.employeeId || '-'],
      ];

      body.innerHTML = `
        <div style="max-width:560px;margin:0 auto;">
          <div style="text-align:center;padding:10px 0 4px;">
            <div style="position:relative;display:inline-block;">
              <div style="width:92px;height:92px;border-radius:50%;background:rgba(var(--bgi-primary-rgb),0.1);display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid var(--bgi-primary);margin:0 auto;">
                ${photoUrl ?
                  `<img src="${UI.escapeHtml(photoUrl)}" style="width:100%;height:100%;object-fit:cover;" id="hod-profile-photo-img" />` :
                  `<ion-icon name="person-circle-outline" style="font-size:46px;color:var(--bgi-primary);"></ion-icon>`
                }
              </div>
              <ion-button id="hod-edit-photo-btn" style="position:absolute;bottom:0;right:-2px;--padding-start:6px;--padding-end:6px;--padding-top:2px;--padding-bottom:2px;--border-radius:50%;--min-height:28px;--min-width:28px;height:28px;width:28px;font-size:12px;--background:var(--bgi-primary);">
                <ion-icon name="camera-outline" style="font-size:14px;color:#fff;"></ion-icon>
              </ion-button>
              <input type="file" id="hod-profile-photo-input" accept="image/*" style="display:none;" />
            </div>
            <p style="font-weight:700;font-size:18px;margin:8px 0 2px;color:var(--bgi-text);">${UI.escapeHtml(user.name || '')}</p>
            <p style="color:var(--bgi-text-secondary);margin:0;font-size:13px;">${UI.escapeHtml(user.email || '')}</p>
            <p style="color:var(--bgi-text-secondary);margin:2px 0 0;font-size:12px;">${UI.escapeHtml(user.department || '')} ${user.college ? '• ' + user.college : ''}</p>
          </div>

          <ion-card style="border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);margin-top:14px;">
            <ion-list lines="inset" style="padding:0;">
              ${profileRows.map(([label, value]) => `
                <ion-item style="font-size:13px;--min-height:38px;">
                  <ion-label style="font-weight:500;color:var(--bgi-text-secondary);">${UI.escapeHtml(label)}</ion-label>
                  <ion-note slot="end" style="font-weight:500;color:var(--bgi-text);">${UI.escapeHtml(String(value))}</ion-note>
                </ion-item>
              `).join('')}
            </ion-list>
          </ion-card>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;">
            <ion-button expand="block" fill="outline" id="hod-edit-profile-btn" style="font-size:12px;height:40px;--border-radius:10px;">
              <ion-icon name="create-outline" slot="start" style="font-size:14px;"></ion-icon> Edit
            </ion-button>
            <ion-button expand="block" fill="outline" color="danger" id="hod-logout-btn" style="font-size:12px;height:40px;--border-radius:10px;">
              <ion-icon name="log-out-outline" slot="start" style="font-size:14px;"></ion-icon> Logout
            </ion-button>
          </div>
        </div>
      `;

      document.getElementById('hod-edit-photo-btn').addEventListener('click', () => {
        document.getElementById('hod-profile-photo-input').click();
      });

      document.getElementById('hod-profile-photo-input').addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          const data = await Api.putMultipart('/auth/profile-photo', {}, file, 'photo');
          const img = document.getElementById('hod-profile-photo-img');
          if (img) {
            const reader = new FileReader();
            reader.onload = (event) => { img.src = event.target.result; };
            reader.readAsDataURL(file);
          }
          await Auth.fetchProfile();
          if (data.data?.profileImageUrl) {
            const current = Auth.getCurrentUser();
            if (current) {
              current.profileImageUrl = data.data.profileImageUrl;
              Storage.saveUser(current);
            }
          }
          UI.toast('Profile photo updated', 'success');
        } catch (err) {
          UI.toast(err.message || 'Upload failed', 'danger');
        }
      });

      document.getElementById('hod-edit-profile-btn').addEventListener('click', () => {
        this._showHodProfileModal(user);
      });

      document.getElementById('hod-logout-btn').addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        Auth.logout();
      });
    } catch (e) {
      body.innerHTML = `<p class="empty-state">${UI.escapeHtml(e.message)}</p>`;
    }
  },

  _showHodProfileModal(user) {
    const modal = document.createElement('ion-modal');
    modal.cssText = '--height:auto;--width:100%;--max-height:90%;--border-radius:16px;';
    modal.innerHTML = `
      <ion-header>
        <ion-toolbar style="--background:var(--bgi-primary);--color:#fff;--min-height:44px;">
          <ion-title style="font-size:15px;font-weight:600;">Edit Profile</ion-title>
          <ion-buttons slot="end">
            <ion-button id="hod-edit-profile-close" style="color:#fff;font-size:13px;">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-list lines="none" style="padding:0;">
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Full Name</ion-label>
            <ion-input id="hod-edit-name" value="${UI.escapeHtml(user.name || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Phone</ion-label>
            <ion-input id="hod-edit-phone" type="tel" value="${UI.escapeHtml(user.phone || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Campus</ion-label>
            <ion-input id="hod-edit-campus" value="${UI.escapeHtml(user.campus || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">College</ion-label>
            <ion-input id="hod-edit-college" value="${UI.escapeHtml(user.college || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Department</ion-label>
            <ion-input id="hod-edit-department" value="${UI.escapeHtml(user.department || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Employee ID</ion-label>
            <ion-input id="hod-edit-employeeId" value="${UI.escapeHtml(user.employeeId || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
        </ion-list>
        <ion-button expand="block" id="hod-edit-profile-save" style="--border-radius:10px;height:42px;font-size:13px;font-weight:600;--background:var(--bgi-primary);">
          <ion-icon name="save-outline" slot="start" style="font-size:14px;"></ion-icon> Save Changes
        </ion-button>
      </ion-content>
    `;
    document.body.appendChild(modal);
    modal.present();

    modal.querySelector('#hod-edit-profile-close').addEventListener('click', () => modal.dismiss());

    modal.querySelector('#hod-edit-profile-save').addEventListener('click', async () => {
      const name = modal.querySelector('#hod-edit-name').value.trim();
      const phone = modal.querySelector('#hod-edit-phone').value.trim();
      const campus = modal.querySelector('#hod-edit-campus').value.trim();
      const college = modal.querySelector('#hod-edit-college').value.trim();
      const department = modal.querySelector('#hod-edit-department').value.trim();
      const employeeId = modal.querySelector('#hod-edit-employeeId').value.trim();

      if (!name) return UI.toast('Name is required', 'warning');

      try {
        const payload = { name, phone, campus, college, department, employeeId };
        Object.entries(payload).forEach(([key, value]) => { if (!value) delete payload[key]; });
        await Api.put('/auth/me', payload);
        await Auth.fetchProfile();
        await UI.toast('Profile updated!', 'success');
        modal.dismiss();
        this._loadProfile();
      } catch (e) {
        await UI.toast(e.message || 'Failed', 'danger');
      }
    });
  },

  async _loadHome() {
    const body = document.getElementById('hod-dash-body');
    body.innerHTML = `<div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div>`;
    try {
      const res = await Api.get('/hod/stats');
      const s = res.data || {};
      const pending = Number(s.pending || 0);
      const approved = Number(s.approved || 0);
      const rejected = Number(s.rejected || 0);
      const total = Number(s.totalRequests || pending + approved + rejected);

      body.innerHTML = `
        <ion-card id="hod-home-leave-requests" style="margin-bottom:8px;cursor:pointer;">
          <div class="ion-padding" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
              <div style="font-weight:800;font-size:15px;">Leave Requests</div>
              <div style="font-size:12px;color:var(--bgi-text-secondary);">View and manage student leave requests</div>
            </div>
            <ion-icon name="document-text-outline" style="font-size:28px;color:var(--bgi-primary);"></ion-icon>
          </div>
        </ion-card>

        <ion-card id="hod-home-faculty-leave-requests" style="margin-bottom:12px;cursor:pointer;">
          <div class="ion-padding" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
              <div style="font-weight:800;font-size:15px;">Faculty Leave Requests</div>
              <div style="font-size:12px;color:var(--bgi-text-secondary);">View and manage faculty leave requests separately</div>
            </div>
            <ion-icon name="people-outline" style="font-size:28px;color:#0ea5e9;"></ion-icon>
          </div>
        </ion-card>

        <div class="stat-cards-grid">
          <ion-card class="stat-card" data-jump="all"><div class="value" style="color:var(--bgi-primary)">${total}</div><div class="label">Total Requests</div></ion-card>
          <ion-card class="stat-card" data-jump="Pending"><div class="value" style="color:var(--bgi-warning)">${pending}</div><div class="label">Pending</div></ion-card>
          <ion-card class="stat-card" data-jump="Approved"><div class="value" style="color:var(--bgi-success)">${approved}</div><div class="label">Approved</div></ion-card>
          <ion-card class="stat-card" data-jump="Rejected"><div class="value" style="color:var(--bgi-danger)">${rejected}</div><div class="label">Rejected</div></ion-card>
        </div>

        <ion-card>
          <div class="ion-padding">
            <p style="font-weight:600;margin:0 0 14px;">Department Overview</p>
            <div style="display:flex;align-items:center;gap:20px;">
              ${this._donutSvg(pending, approved, rejected)}
              <div style="flex:1;">
                <div class="legend-row"><span class="legend-dot" style="background:var(--bgi-warning)"></span><span class="legend-label">Pending</span><span class="legend-value">${pending}</span></div>
                <div class="legend-row"><span class="legend-dot" style="background:var(--bgi-success)"></span><span class="legend-label">Approved</span><span class="legend-value">${approved}</span></div>
                <div class="legend-row"><span class="legend-dot" style="background:var(--bgi-danger)"></span><span class="legend-label">Rejected</span><span class="legend-value">${rejected}</span></div>
              </div>
            </div>
          </div>
        </ion-card>
      
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
        <ion-card id="hod-home-faculty-pending" style="margin:0;border-left:3px solid var(--bgi-warning);cursor:pointer;">
          <div style="padding:10px 12px;display:flex;align-items:center;gap:8px;">
            <ion-icon name="time-outline" style="font-size:18px;color:var(--bgi-warning);flex-shrink:0;"></ion-icon>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:13px;">Pending Faculty Approvals</div>
              <div id="hod-home-faculty-pending-count" style="font-size:11px;color:var(--bgi-text-secondary);">Checking...</div>
            </div>
            <ion-icon name="chevron-forward-outline" style="font-size:16px;color:var(--bgi-text-secondary);"></ion-icon>
          </div>
        </ion-card>

        <ion-card id="hod-home-guard-pending" style="margin:0;border-left:3px solid var(--bgi-warning);cursor:pointer;">
          <div style="padding:10px 12px;display:flex;align-items:center;gap:8px;">
            <ion-icon name="time-outline" style="font-size:18px;color:var(--bgi-warning);flex-shrink:0;"></ion-icon>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:13px;">Pending Guard Approvals</div>
              <div id="hod-home-guard-pending-count" style="font-size:11px;color:var(--bgi-text-secondary);">Checking...</div>
            </div>
            <ion-icon name="chevron-forward-outline" style="font-size:16px;color:var(--bgi-text-secondary);"></ion-icon>
          </div>
        </ion-card>
      </div>
      `;

      body.querySelectorAll('.stat-card').forEach((card) => {
        card.addEventListener('click', () => {
          this._requestsFilter = card.dataset.jump === 'all' ? 'Pending' : card.dataset.jump;
          this._switchTab('requests');
        });
      });

      document.getElementById('hod-home-faculty-pending')?.addEventListener('click', () => this._showPendingFacultyApprovals());
      document.getElementById('hod-home-guard-pending')?.addEventListener('click', () => this._showPendingGuardApprovals());
      document.getElementById('hod-home-leave-requests')?.addEventListener('click', () => {
        this._requestsView = 'student';
        this._requestsFilter = 'All';
        this._switchTab('requests');
      });
      document.getElementById('hod-home-faculty-leave-requests')?.addEventListener('click', () => {
        this._requestsView = 'faculty';
        this._requestsFilter = 'All';
        this._switchTab('requests');
      });

      this._refreshFacultyPendingCount();
      this._refreshGuardPendingCount();
    } catch (e) {
      body.innerHTML = `<p class="empty-state">${UI.escapeHtml(e.message)}</p>`;
    }
  },

  _donutSvg(pending, approved, rejected) {
    const total = pending + approved + rejected;
    const r = 52, cx = 65, cy = 65, circumference = 2 * Math.PI * r;
    if (total === 0) {
      return `<svg width="130" height="130"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E5E8EE" stroke-width="18"/></svg>`;
    }
    const segments = [
      { value: pending, color: '#E8920A' },
      { value: approved, color: '#1B8A4C' },
      { value: rejected, color: '#DB3B3B' },
    ];
    let offset = 0;
    const circles = segments.map((seg) => {
      const fraction = seg.value / total;
      const dash = fraction * circumference;
      const circle = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="18"
        stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += dash;
      return circle;
    }).join('');
    return `<svg width="130" height="130" viewBox="0 0 130 130">${circles}</svg>`;
  },

  async _loadRequests() {
    const body = document.getElementById('hod-dash-body');
    const statuses = ['All', 'Pending', 'Approved', 'Rejected'];
    body.innerHTML = `
      <ion-segment value="${this._requestsView}" id="hod-request-view-segment" style="margin-bottom:8px;">
        <ion-segment-button value="student"><ion-label>Student Leave</ion-label></ion-segment-button>
        <ion-segment-button value="faculty"><ion-label>Faculty Leave</ion-label></ion-segment-button>
      </ion-segment>
      <ion-segment value="${this._requestsFilter}" id="hod-segment">
        ${statuses.map((s) => `<ion-segment-button value="${s}"><ion-label>${s}</ion-label></ion-segment-button>`).join('')}
      </ion-segment>
      <div id="hod-requests-list" class="mt-16"></div>
    `;
    document.getElementById('hod-request-view-segment').addEventListener('ionChange', (e) => {
      this._requestsView = e.detail.value;
      this._renderList();
    });
    document.getElementById('hod-segment').addEventListener('ionChange', (e) => {
      this._requestsFilter = e.detail.value;
      this._renderList();
    });
    await this._renderList();
  },

  async _renderList() {
    const list = document.getElementById('hod-requests-list');
    list.innerHTML = `<div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div>`;
    try {
      const res = await Api.get('/hod/requests', { status: this._requestsFilter });
      const allRequests = res.data || [];
      const requests = allRequests.filter((r) => {
        const role = (r.student?.role || '').toUpperCase();
        return this._requestsView === 'faculty' ? role === 'FACULTY' : role !== 'FACULTY';
      });
      if (requests.length === 0) {
        list.innerHTML = `<p class="empty-state">No ${this._requestsView === 'faculty' ? 'faculty' : 'student'} leave requests found</p>`;
        return;
      }
      list.innerHTML = await UI.leaveCardsHtml(requests, { showStudentName: true, showHodActions: true, showExitTimeOnly: true });
      UI.attachLeaveCardHandlers(list, {
        onApprove: (id) => this._decide(id, true),
        onReject: (id) => this._decide(id, false),
      });
    } catch (e) {
      list.innerHTML = `<p class="empty-state">${UI.escapeHtml(e.message)}</p>`;
    }
  },

  async _decide(id, approve) {
    const { confirmed, remark } = await UI.confirmWithRemark({
      title: approve ? 'Final Approve' : 'Reject Request',
      confirmText: approve ? 'Approve' : 'Reject',
      confirmColor: approve ? 'primary' : 'danger',
    });
    if (!confirmed) return;

    try {
      const path = approve ? `/hod/requests/${id}/approve` : `/hod/requests/${id}/reject`;
      await Api.put(path, { remark });
      await UI.toast(approve ? 'Leave approved — E-Pass generated' : 'Leave rejected', approve ? 'success' : 'medium');
      this._renderList();
    } catch (e) {
      await UI.toast(e.message || 'Action failed', 'danger');
    }
  },

  async _showMemberDetail(memberId) {
    if (!memberId) return;
    let member = this._membersById[memberId];
    try {
      const res = await Api.get(`/hod/members/${memberId}`);
      if (res && res.data) member = res.data;
    } catch (e) {
      if (!member) return UI.toast('Member details not loaded yet', 'danger');
    }

    const roleDetails = {
      STUDENT: `
        <ion-item><ion-label>Roll Number</ion-label><ion-note slot="end">${UI.escapeHtml(member.rollNumber || '-')}</ion-note></ion-item>
        <ion-item><ion-label>Branch</ion-label><ion-note slot="end">${UI.escapeHtml(member.branch || '-')}</ion-note></ion-item>
        <ion-item><ion-label>Semester</ion-label><ion-note slot="end">${member.semester || '-'}</ion-note></ion-item>
        <ion-item><ion-label>Advisor</ion-label><ion-note slot="end">${UI.escapeHtml(member.facultyAdvisorId || '-')}</ion-note></ion-item>`,
      FACULTY: `
        <ion-item><ion-label>Designation</ion-label><ion-note slot="end">${UI.escapeHtml(member.designation || '-')}</ion-note></ion-item>`,
      GUARD: `
        <ion-item><ion-label>Assigned Gate</ion-label><ion-note slot="end">${UI.escapeHtml(member.assignedGate || '-')}</ion-note></ion-item>`,
      HOD: `
        <ion-item><ion-label>Employee ID</ion-label><ion-note slot="end">${UI.escapeHtml(member.employeeId || '-')}</ion-note></ion-item>
        <ion-item><ion-label>Qualification</ion-label><ion-note slot="end">${UI.escapeHtml(member.qualification || '-')}</ion-note></ion-item>
        <ion-item><ion-label>Alt. Contact</ion-label><ion-note slot="end">${UI.escapeHtml(member.alternatePhone || '-')}</ion-note></ion-item>
        <ion-item><ion-label>Office Room</ion-label><ion-note slot="end">${UI.escapeHtml(member.officeRoom || '-')}</ion-note></ion-item>`,
    };

    const modal = document.createElement('ion-modal');
    modal.innerHTML = `
      <ion-header><ion-toolbar>
        <ion-title>${UI.escapeHtml(member.name || 'Member')}</ion-title>
        <ion-buttons slot="end"><ion-button id="hod-member-detail-close">Close</ion-button></ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content class="ion-padding">
        ${member.profileImageUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${UI.escapeHtml(member.profileImageUrl)}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;" /></div>` : ''}
        <ion-list lines="inset">
          <ion-item><ion-label>Name</ion-label><ion-note slot="end">${UI.escapeHtml(member.name)}</ion-note></ion-item>
          <ion-item><ion-label>Email</ion-label><ion-note slot="end">${UI.escapeHtml(member.email)}</ion-note></ion-item>
          <ion-item><ion-label>Role</ion-label><ion-note slot="end">${UI.escapeHtml(member.role)}</ion-note></ion-item>
          <ion-item><ion-label>Department</ion-label><ion-note slot="end">${UI.escapeHtml(member.department || '-')}</ion-note></ion-item>
          <ion-item><ion-label>Campus</ion-label><ion-note slot="end">${UI.escapeHtml(member.campus || '-')}</ion-note></ion-item>
          <ion-item><ion-label>Phone</ion-label><ion-note slot="end">${UI.escapeHtml(member.phone || '-')}</ion-note></ion-item>
          ${roleDetails[member.role] || ''}
        </ion-list>
      </ion-content>`;

    document.body.appendChild(modal);
    await modal.present();
    modal.querySelector('#hod-member-detail-close').addEventListener('click', () => modal.dismiss());

    // Add Remove Member button for HOD (students/faculty/guards)
    if (['STUDENT','FACULTY','GUARD'].includes(member.role)) {
      const footer = document.createElement('div');
      footer.style.padding = '12px';
      footer.innerHTML = `<ion-button expand="block" color="danger" id="hod-member-remove-btn">Remove Member</ion-button>`;
      modal.querySelector('ion-content').appendChild(footer);
      modal.querySelector('#hod-member-remove-btn').addEventListener('click', async () => {
        const { confirmed, remark } = await UI.confirmWithRemark({
          title: `Remove ${member.name || 'member'}?`,
          placeholder: 'Optional reason',
          confirmText: 'Remove',
          confirmColor: 'danger',
        });
        if (!confirmed) return;
        try {
          await Api.delete(`/hod/members/${memberId}`);
          UI.toast('Member removed', 'success');
          modal.dismiss();
          await this._renderMembersList();
        } catch (e) {
          UI.toast(e.message || 'Remove failed', 'danger');
        }
      });
    }
  },


  async _handleStudentListUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Get user details for department and campus
    const user = await Auth.fetchProfile();
    if (!user.department || !user.campus) {
      UI.toast('User department/campus info missing', 'danger');
      return;
    }

    // Show loading
    const loadingToast = await UI.toast('Uploading student list...', 'primary');
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('studentList', file);
      formData.append('department', user.department);
      formData.append('campus', user.campus);

      // Upload file
      const response = await fetch(`${APP_CONFIG.baseUrl}/hod/student-list/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Storage.getToken()}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      UI.toast(`✅ ${data.message}`, 'success');

      // Reset file input
      const input = document.getElementById('hod-student-upload-input');
      if (input) input.value = '';

      // Reload members list
      await this._renderMembersList();
    } catch (error) {
      UI.toast(error.message || 'Upload failed', 'danger');
    }
  },



  _spinner() {
    return `<div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div>`;
  },
};