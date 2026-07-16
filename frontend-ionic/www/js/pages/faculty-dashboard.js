// =====================================================================
// E-PASS — Student Dashboard (Home / Requests / History / Profile tabs)
// With Profile Photo Upload & Edit + Live Location
// =====================================================================

Pages['faculty-dashboard'] = {
  _activeTab: 'home',
  _requestsFilter: 'All',
  _profilePhotoFile: null,
  _userLocation: null,
  _locationError: null,

  render() {
    this._activeTab = 'home';
    this._profilePhotoFile = null;
    this._locationError = null;
    return `
      <ion-header><ion-toolbar>
        <div slot="start" style="padding-left:12px;display:flex;align-items:center;">
          <img src="assets/images/logo.png" alt="BGI Logo"
               style="height:36px;width:auto;object-fit:contain;"
               onerror="this.style.display='none'" />
        </div>
        <ion-title id="dash-title" style="text-align:center;font-size:17px;font-weight:700;color:var(--bgi-text);">Faculty Dashboard</ion-title>
        <ion-buttons slot="end" id="dash-header-actions"></ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content fullscreen><div id="dash-body" class="ion-padding"></div></ion-content>
      <ion-tab-bar id="dash-tabbar" style="--background:var(--bgi-surface);border-top:2px solid var(--bgi-border);">
        <ion-tab-button data-tab="home" class="active" style="--color-selected:var(--bgi-primary);">
          <ion-icon name="home-outline"></ion-icon><ion-label>Home</ion-label>
        </ion-tab-button>
        <ion-tab-button data-tab="requests" style="--color-selected:var(--bgi-primary);">
          <ion-icon name="document-text-outline"></ion-icon><ion-label>Requests</ion-label>
        </ion-tab-button>
        <ion-tab-button data-tab="history" style="--color-selected:var(--bgi-primary);">
          <ion-icon name="time-outline"></ion-icon><ion-label>History</ion-label>
        </ion-tab-button>
        <ion-tab-button data-tab="profile" style="--color-selected:var(--bgi-primary);">
          <ion-icon name="person-outline"></ion-icon><ion-label>Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    `;
  },

  afterRender() {
    document.querySelectorAll('#dash-tabbar ion-tab-button').forEach((btn) => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });
    this._switchTab('home');
    this._getUserLocation();
  },

  _switchTab(tab) {
    this._activeTab = tab;
    document.querySelectorAll('#dash-tabbar ion-tab-button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const titles = { home: 'Faculty Dashboard', requests: 'My Requests', history: 'Leave History', profile: 'Profile' };
    document.getElementById('dash-title').textContent = titles[tab];

    const actions = document.getElementById('dash-header-actions');
    actions.innerHTML = tab === 'home'
      ? `<ion-button id="notif-bell-btn" style="--color:var(--bgi-primary);"><ion-icon name="notifications-outline" slot="icon-only" style="font-size:22px;"></ion-icon></ion-button>`
      : '';
    if (tab === 'home') {
      document.getElementById('notif-bell-btn').addEventListener('click', () => {
        this._lastNotifCount = 0;
        Router.navigate('notifications');
      });
    }

    if (tab === 'home') this._loadHome();
    else if (tab === 'requests') this._loadRequests();
    else if (tab === 'history') this._loadHistory();
    else if (tab === 'profile') this._loadProfile();
  },

  // ===================================================================
  // GET USER LOCATION
  // ===================================================================
  _getUserLocation() {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      this._userLocation = null;
      this._locationError = 'Geolocation not supported by your browser.';
      if (this._activeTab === 'home') this._updateLocationDisplay();
      return;
    }

    this._locationError = null;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this._userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
        console.log('Location captured:', this._userLocation);
        if (this._activeTab === 'home') {
          this._updateLocationDisplay();
          this._lookupLocationName();
        }
      },
      (error) => {
        console.log('Location error:', error.code, error.message);
        this._userLocation = null;
        this._locationError = error.code === 1
          ? 'Location permission denied. Please allow location access.'
          : 'Unable to capture location. Please try again.';
        if (this._activeTab === 'home') {
          this._updateLocationDisplay();
        }
        if (error.code !== 1) {
          setTimeout(() => this._getUserLocation(), 5000);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  },

  async _lookupLocationName() {
    if (!this._userLocation?.lat || !this._userLocation?.lng) return;
    const locationText = this._userLocation.address || 'Resolving place name...';
    this._userLocation.address = locationText;

    const name = await Api.reverseGeocode(this._userLocation.lat, this._userLocation.lng);
    if (name) {
      this._userLocation.address = name;
      this._updateLocationDisplay();
    }
  },

  _updateLocationDisplay() {
    const locationEl = document.getElementById('user-location-display');
    if (!locationEl) return;
    
    if (this._userLocation) {
      const label = this._userLocation.address || `${this._userLocation.lat.toFixed(6)}, ${this._userLocation.lng.toFixed(6)}`;
      const accuracy = Math.round(this._userLocation.accuracy);
      locationEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;width:100%;">
          <div style="background:rgba(34,197,94,0.12);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <ion-icon name="location" style="font-size:16px;color:var(--bgi-success);"></ion-icon>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:11px;font-weight:600;color:var(--bgi-text);">Live Location</div>
            <div style="font-size:10px;color:var(--bgi-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${label} <span style="opacity:0.6;">(±${accuracy}m)</span>
            </div>
          </div>
          <ion-button fill="clear" size="small" id="refresh-location-btn" style="font-size:10px;height:28px;--padding-start:6px;--padding-end:6px;--color:var(--bgi-primary);">
            <ion-icon name="refresh-outline" style="font-size:16px;"></ion-icon>
          </ion-button>
        </div>
      `;
      document.getElementById('refresh-location-btn')?.addEventListener('click', () => this._getUserLocation());
    } else {
      const errorMessage = this._locationError || 'Getting location...';
      locationEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;width:100%;">
          <div style="background:rgba(251,191,36,0.12);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <ion-icon name="location-outline" style="font-size:16px;color:var(--bgi-warning);"></ion-icon>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:11px;font-weight:600;color:var(--bgi-text);">Live Location</div>
            <div style="font-size:10px;color:var(--bgi-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${errorMessage}</div>
          <ion-button fill="clear" size="small" id="retry-location-btn" style="font-size:10px;height:28px;--padding-start:6px;--padding-end:6px;--color:var(--bgi-primary);">
            <ion-icon name="refresh-outline" style="font-size:16px;"></ion-icon>
          </ion-button>
        </div>
      `;
      document.getElementById('retry-location-btn')?.addEventListener('click', () => this._getUserLocation());
    }
  },

  async _loadHome() {
    const body = document.getElementById('dash-body');
    body.innerHTML = `<div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div>`;
    try {
      const [user, historyRes, unreadRes] = await Promise.all([
        Auth.fetchProfile(),
        Api.get('/leave/history'),
        Api.get('/notifications/unread-count'),
      ]);
      const requests = historyRes.data || [];
      const counts = { total: requests.length, approved: 0, pending: 0, rejected: 0 };
      requests.forEach((r) => {
        if (r.overall_status === 'Approved') counts.approved++;
        else if (r.overall_status === 'Rejected') counts.rejected++;
        else counts.pending++;
      });
      const unread = unreadRes.data?.count || 0;
      let approvedPassData = null;
      const approvedLeave = requests.find((r) => (r.overall_status || r.overallStatus) === 'Approved');
      if (approvedLeave) {
        try {
          const epassRes = await Api.get(`/epass/${approvedLeave.id || approvedLeave._id}`);
          approvedPassData = epassRes.data || null;
        } catch (_) {}
      }

      body.innerHTML = `
        <!-- Location Bar -->
        <div id="user-location-display" style="background:var(--bgi-surface);border-radius:14px;border:1px solid var(--bgi-border);padding:8px 14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          ${this._userLocation ? `
            <div style="display:flex;align-items:center;gap:8px;width:100%;">
              <div style="background:rgba(34,197,94,0.12);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <ion-icon name="location" style="font-size:16px;color:var(--bgi-success);"></ion-icon>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:11px;font-weight:600;color:var(--bgi-text);">Live Location</div>
                <div style="font-size:10px;color:var(--bgi-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  ${this._userLocation.address || `${this._userLocation.lat.toFixed(6)}, ${this._userLocation.lng.toFixed(6)}`} <span style="opacity:0.6;">(±${Math.round(this._userLocation.accuracy)}m)</span>
                </div>
              </div>
              <ion-button fill="clear" size="small" id="refresh-location-btn" style="font-size:10px;height:28px;--padding-start:6px;--padding-end:6px;--color:var(--bgi-primary);">
                <ion-icon name="refresh-outline" style="font-size:16px;"></ion-icon>
              </ion-button>
            </div>
          ` : `
            <div style="display:flex;align-items:center;gap:8px;width:100%;">
              <div style="background:rgba(251,191,36,0.12);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <ion-icon name="location-outline" style="font-size:16px;color:var(--bgi-warning);"></ion-icon>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:11px;font-weight:600;color:var(--bgi-text);">Live Location</div>
                <div style="font-size:10px;color:var(--bgi-text-secondary);">Getting location...</div>
              </div>
              <ion-button fill="clear" size="small" id="retry-location-btn" style="font-size:10px;height:28px;--padding-start:6px;--padding-end:6px;--color:var(--bgi-primary);">
                <ion-icon name="refresh-outline" style="font-size:16px;"></ion-icon>
              </ion-button>
            </div>
          `}
        </div>

        <!-- Welcome Card -->
        <div style="background:linear-gradient(135deg, var(--bgi-primary), #4338ca);border-radius:16px;padding:18px 20px;margin-bottom:14px;box-shadow:0 4px 16px rgba(99,102,241,0.25);display:flex;align-items:center;gap:14px;">
          <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid rgba(255,255,255,0.3);flex-shrink:0;" id="welcome-avatar">
            ${user.profile?.photo ? 
              `<img src="${UI.escapeHtml(user.profile.photo)}" style="width:100%;height:100%;object-fit:cover;" />` :
              `<ion-icon name="person" style="font-size:28px;color:#fff;"></ion-icon>`
            }
          </div>
          <div style="flex:1;min-width:0;color:#fff;">
            <div style="font-size:16px;font-weight:700;">Welcome, ${UI.escapeHtml(user.name)}</div>
            <div style="font-size:12px;opacity:0.85;margin-top:2px;">Employee ID: ${UI.escapeHtml(user.employeeId || '-')}</div>
            <div style="font-size:11px;opacity:0.7;">${UI.escapeHtml(user.department || '')} ${user.designation ? '- ' + user.designation : ''}</div>
          </div>
          <div style="background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 12px;font-size:10px;color:#fff;font-weight:600;white-space:nowrap;">Faculty</div>
        </div>

        <!-- Action Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
          <div id="tile-apply-leave" style="background:var(--bgi-surface);border-radius:14px;padding:14px 8px;text-align:center;cursor:pointer;border:1px solid var(--bgi-border);transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="width:40px;height:40px;border-radius:12px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 6px;">
              <ion-icon name="create-outline" style="font-size:20px;color:var(--bgi-primary);"></ion-icon>
            </div>
            <div style="font-size:10px;font-weight:600;color:var(--bgi-text);">Apply Leave</div>
          </div>
          ${approvedPassData ? `<div id="tile-my-epass" style="background:linear-gradient(135deg, rgba(10,77,173,0.04), rgba(34,197,94,0.04));border-radius:14px;padding:14px 8px;text-align:center;cursor:pointer;border:1px solid rgba(10,77,173,0.08);transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="width:40px;height:40px;border-radius:12px;background:rgba(10,77,173,0.08);display:flex;align-items:center;justify-content:center;margin:0 auto 6px;">
              <ion-icon name="qr-code" style="font-size:20px;color:var(--bgi-primary);"></ion-icon>
            </div>
            <div style="font-size:10px;font-weight:600;color:var(--bgi-text);">My E-Pass</div>
          </div>` : ''}
          <div id="tile-my-requests" style="background:var(--bgi-surface);border-radius:14px;padding:14px 8px;text-align:center;cursor:pointer;border:1px solid var(--bgi-border);transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="width:40px;height:40px;border-radius:12px;background:rgba(14,165,233,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 6px;">
              <ion-icon name="list-outline" style="font-size:20px;color:#0ea5e9;"></ion-icon>
            </div>
            <div style="font-size:10px;font-weight:600;color:var(--bgi-text);">Requests</div>
          </div>
          <div id="tile-leave-history" style="background:var(--bgi-surface);border-radius:14px;padding:14px 8px;text-align:center;cursor:pointer;border:1px solid var(--bgi-border);transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="width:40px;height:40px;border-radius:12px;background:rgba(251,191,36,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 6px;">
              <ion-icon name="time-outline" style="font-size:20px;color:#f59e0b;"></ion-icon>
            </div>
            <div style="font-size:10px;font-weight:600;color:var(--bgi-text);">History</div>
          </div>
          <div id="tile-notifications" style="background:var(--bgi-surface);border-radius:14px;padding:14px 8px;text-align:center;cursor:pointer;border:1px solid var(--bgi-border);transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.04);position:relative;">
            ${unread > 0 ? `<div style="position:absolute;top:6px;right:10px;background:var(--bgi-danger);color:#fff;font-size:9px;font-weight:700;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">${unread}</div>` : ''}
            <div style="width:40px;height:40px;border-radius:12px;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 6px;">
              <ion-icon name="notifications-outline" style="font-size:20px;color:#ef4444;"></ion-icon>
            </div>
            <div style="font-size:10px;font-weight:600;color:var(--bgi-text);">Notifs</div>
          </div>
        </div>

        <!-- Stats Card -->
        <div style="background:var(--bgi-surface);border-radius:14px;border:1px solid var(--bgi-border);padding:14px 16px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="font-size:12px;font-weight:600;color:var(--bgi-text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">📊 Leave Overview</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;text-align:center;">
            <div>
              <div style="font-size:20px;font-weight:800;color:var(--bgi-text);">${counts.total}</div>
              <div style="font-size:9px;color:var(--bgi-text-secondary);">Total</div>
            </div>
            <div>
              <div style="font-size:20px;font-weight:800;color:var(--bgi-success);">${counts.approved}</div>
              <div style="font-size:9px;color:var(--bgi-text-secondary);">Approved</div>
            </div>
            <div>
              <div style="font-size:20px;font-weight:800;color:var(--bgi-warning);">${counts.pending}</div>
              <div style="font-size:9px;color:var(--bgi-text-secondary);">Pending</div>
            </div>
            <div>
              <div style="font-size:20px;font-weight:800;color:var(--bgi-danger);">${counts.rejected}</div>
              <div style="font-size:9px;color:var(--bgi-text-secondary);">Rejected</div>
            </div>
          </div>
        </div>

        ${approvedPassData ? `
          <div id="qr-option-card" style="background:linear-gradient(135deg, rgba(10,77,173,0.04), rgba(34,197,94,0.04));border-radius:16px;padding:14px 16px;margin-bottom:14px;border:1px solid rgba(10,77,173,0.12);">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                <div style="width:38px;height:38px;border-radius:12px;background:rgba(10,77,173,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <ion-icon name="qr-code-outline" style="font-size:20px;color:var(--bgi-primary);"></ion-icon>
                </div>
                <div style="min-width:0;">
                  <div style="font-size:13px;font-weight:700;color:var(--bgi-text);">View your QR Pass</div>
                  <div style="font-size:11px;color:var(--bgi-text-secondary);">Tap to open the approved pass QR</div>
                </div>
              </div>
              <ion-button fill="outline" size="small" id="qr-option-btn" style="--border-radius:999px;height:32px;font-size:11px;">Open QR</ion-button>
            </div>
          </div>
        ` : ''}

        ${this._renderApprovedPassCard(approvedPassData || null)}

        <!-- Notice -->
        <div style="background:rgba(99,102,241,0.06);border-radius:12px;border:1px solid rgba(99,102,241,0.15);padding:10px 14px;display:flex;align-items:flex-start;gap:10px;">
          <ion-icon name="information-circle-outline" style="font-size:18px;color:var(--bgi-primary);flex-shrink:0;margin-top:1px;"></ion-icon>
          <p style="font-size:11px;color:var(--bgi-text-secondary);margin:0;line-height:1.4;"><b style="color:var(--bgi-text);">Notice:</b> Apply for leave at least 1 day before.</p>
        </div>
      `;

      // Event Listeners
      document.getElementById('refresh-location-btn')?.addEventListener('click', () => this._getUserLocation());
      document.getElementById('retry-location-btn')?.addEventListener('click', () => this._getUserLocation());
      if (approvedPassData) {
        try {
          const qrContainer = document.getElementById('faculty-epass-qr');
          if (qrContainer && typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
              text: approvedPassData.pass_id || approvedPassData.passId || '',
              width: 140,
              height: 140,
              colorDark: '#0A4DAD',
              colorLight: '#ffffff',
            });
          }
        } catch (_) {}
      }
      document.getElementById('view-approved-pass-btn')?.addEventListener('click', () => {
        const approvedLeave = (requests || []).find((item) => (item.overall_status || item.overallStatus) === 'Approved');
        if (approvedLeave) Router.navigate('epass', { leaveRequestId: approvedLeave.id || approvedLeave._id });
      });
      document.getElementById('qr-option-btn')?.addEventListener('click', () => {
        if (approvedPassData && approvedPassData.leave_request && approvedPassData.leave_request.id) {
          Router.navigate('epass', { leaveRequestId: approvedPassData.leave_request.id });
        }
      });
      document.getElementById('tile-my-epass')?.addEventListener('click', () => {
        if (approvedPassData && approvedPassData.leave_request && approvedPassData.leave_request.id) {
          Router.navigate('epass', { leaveRequestId: approvedPassData.leave_request.id });
        }
      });
      const applyLeaveTile = document.getElementById('tile-apply-leave');
      if (applyLeaveTile) {
        applyLeaveTile.setAttribute('role', 'button');
        applyLeaveTile.setAttribute('tabindex', '0');
        applyLeaveTile.style.touchAction = 'manipulation';
        const openApplyLeave = (event) => {
          if (event) {
            event.preventDefault();
            event.stopPropagation();
          }
          this._showApplyLeaveModal();
        };
        applyLeaveTile.addEventListener('click', openApplyLeave);
        applyLeaveTile.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openApplyLeave(event);
          }
        });
      }
      document.getElementById('tile-my-requests')?.addEventListener('click', () => this._switchTab('requests'));
      document.getElementById('tile-leave-history').addEventListener('click', () => this._switchTab('history'));
      document.getElementById('tile-notifications').addEventListener('click', () => Router.navigate('notifications'));
    } catch (e) {
      body.innerHTML = `<p class="empty-state">${UI.escapeHtml(e.message)}</p>`;
    }
  },

  _renderApprovedPassCard(approvedPassData) {
    if (!approvedPassData) return '';

    const passId = approvedPassData.pass_id || approvedPassData.passId || '';
    const hodApprovedBy = approvedPassData.hod_approved_by_name || approvedPassData.hodApprovedByName || '';
    const directorApprovedBy = approvedPassData.director_approved_by_name || approvedPassData.directorApprovedByName || '';
    const approvedBy = approvedPassData.approved_by_name || approvedPassData.approvedByName || '';
    const approvedAt = approvedPassData.approved_at || approvedPassData.approvedAt || '';
    const qrUrl = approvedPassData.qr_code_url || approvedPassData.qrCodeUrl || '';
    const locationText = approvedPassData.location_address || '';
    const purpose = approvedPassData.leave_request?.purpose || approvedPassData.purpose || '';

    return `
      <div style="background:linear-gradient(135deg, rgba(10,77,173,0.08), rgba(34,197,94,0.08));border:1px solid rgba(10,77,173,0.16);border-radius:16px;padding:14px 14px 12px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--bgi-primary);text-transform:uppercase;letter-spacing:0.5px;">Approved E-Pass</div>
            <div style="font-size:13px;font-weight:700;color:var(--bgi-text);margin-top:2px;">Your leave is approved</div>
          </div>
          <ion-button fill="outline" size="small" id="view-approved-pass-btn" style="--border-radius:999px;height:32px;font-size:11px;">View Pass</ion-button>
        </div>
        <div style="display:grid;gap:8px;font-size:11px;color:var(--bgi-text-secondary);">
          <div style="display:flex;justify-content:center;margin:4px 0 6px;">
            <div id="faculty-epass-qr" style="display:flex;justify-content:center;align-items:center;width:150px;height:150px;padding:8px;border-radius:14px;background:#fff;border:1px solid rgba(10,77,173,0.15);"></div>
          </div>
          ${passId ? `<div><b style="color:var(--bgi-text);">Pass ID:</b> ${UI.escapeHtml(passId)}</div>` : ''}
          ${hodApprovedBy ? `<div><b style="color:var(--bgi-text);">HOD:</b> ${UI.escapeHtml(hodApprovedBy)}</div>` : ''}
          ${directorApprovedBy ? `<div><b style="color:var(--bgi-text);">Director:</b> ${UI.escapeHtml(directorApprovedBy)}</div>` : ''}
          ${!hodApprovedBy && !directorApprovedBy && approvedBy ? `<div><b style="color:var(--bgi-text);">Approved by:</b> ${UI.escapeHtml(approvedBy)}</div>` : ''}
          ${approvedAt ? `<div><b style="color:var(--bgi-text);">Approved on:</b> ${UI.escapeHtml(new Date(approvedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</div>` : ''}
          ${purpose ? `<div><b style="color:var(--bgi-text);">Purpose:</b> ${UI.escapeHtml(purpose)}</div>` : ''}
          ${locationText ? `<div><b style="color:var(--bgi-text);">Location:</b> ${UI.escapeHtml(locationText)}</div>` : ''}
        </div>
      </div>
    `;
  },

  // ===================================================================
  // APPLY LEAVE MODAL (Enhanced UI)
  // ===================================================================
  _showApplyLeaveModal() {
    const currentUser = Auth.getCurrentUser() || Storage.getUser() || {};
    const modal = document.createElement('ion-modal');
    modal.cssText = '--height:auto;--width:100%;--max-height:95%;--border-radius:18px;';
    modal.innerHTML = `
      <ion-header>
        <ion-toolbar style="--background:var(--bgi-primary);--color:#fff;--min-height:48px;">
          <ion-title style="font-size:15px;font-weight:700;padding:0;">
            <ion-icon name="create-outline" style="margin-right:8px;font-size:18px;"></ion-icon> Apply Leave
          </ion-title>
          <ion-buttons slot="end">
            <ion-button id="apply-close-btn" style="color:#fff;font-size:20px;font-weight:300;--padding-start:10px;--padding-end:10px;">✕</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" style="--background:var(--bgi-bg);--padding-top:6px;--padding-bottom:8px;">
        <div style="max-width:480px;margin:0 auto;">
          
          <!-- Location Status -->
          <div style="background:var(--bgi-surface);border-radius:12px;border:1px solid var(--bgi-border);padding:6px 14px 8px;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="background:${this._userLocation ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)'};border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <ion-icon name="location" style="font-size:16px;color:${this._userLocation ? 'var(--bgi-success)' : 'var(--bgi-warning)'};"></ion-icon>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:11px;font-weight:600;color:var(--bgi-text);">📍 Location</div>
                <div id="modal-location-details" style="font-size:10px;color:var(--bgi-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  ${this._userLocation ? 
                    `${this._userLocation.address || `${this._userLocation.lat.toFixed(6)}, ${this._userLocation.lng.toFixed(6)}`}` :
                    'Getting location...'
                  }
                </div>
              </div>
              <ion-button fill="clear" size="small" id="modal-refresh-location" style="font-size:10px;height:26px;--padding-start:4px;--padding-end:4px;--color:var(--bgi-primary);">
                <ion-icon name="refresh-outline" style="font-size:16px;"></ion-icon>
              </ion-button>
            </div>
          </div>

          <!-- Faculty Details -->
          <div style="background:var(--bgi-surface);border-radius:12px;border:1px solid var(--bgi-border);padding:8px 14px 10px;margin-bottom:10px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div>
                <label style="font-size:10px;font-weight:700;color:var(--bgi-text-secondary);display:block;padding-top:2px;letter-spacing:0.5px;text-transform:uppercase;">Faculty Name</label>
                <ion-input id="faculty-name" value="${UI.escapeHtml(currentUser.name || '')}" style="font-size:13px;font-weight:500;color:var(--bgi-text);--padding-top:2px;--padding-bottom:2px;"></ion-input>
              </div>
              <div>
                <label style="font-size:10px;font-weight:700;color:var(--bgi-text-secondary);display:block;padding-top:2px;letter-spacing:0.5px;text-transform:uppercase;">Employee ID</label>
                <ion-input id="employee-id" value="${UI.escapeHtml(currentUser.employeeId || '')}" style="font-size:13px;font-weight:500;color:var(--bgi-text);--padding-top:2px;--padding-bottom:2px;"></ion-input>
              </div>
              <div>
                <label style="font-size:10px;font-weight:700;color:var(--bgi-text-secondary);display:block;padding-top:2px;letter-spacing:0.5px;text-transform:uppercase;">Department</label>
                <ion-input id="faculty-department" value="${UI.escapeHtml(currentUser.department || '')}" style="font-size:13px;font-weight:500;color:var(--bgi-text);--padding-top:2px;--padding-bottom:2px;"></ion-input>
              </div>
              <div>
                <label style="font-size:10px;font-weight:700;color:var(--bgi-text-secondary);display:block;padding-top:2px;letter-spacing:0.5px;text-transform:uppercase;">Designation</label>
                <ion-input id="faculty-designation" value="${UI.escapeHtml(currentUser.designation || '')}" style="font-size:13px;font-weight:500;color:var(--bgi-text);--padding-top:2px;--padding-bottom:2px;"></ion-input>
              </div>
            </div>
            <div style="margin-top:8px;">
              <label style="font-size:10px;font-weight:700;color:var(--bgi-text-secondary);display:block;padding-top:2px;letter-spacing:0.5px;text-transform:uppercase;">HOD Name</label>
              <ion-input id="hod-name" placeholder="Enter HOD name" style="font-size:13px;font-weight:500;color:var(--bgi-text);--padding-top:2px;--padding-bottom:2px;"></ion-input>
            </div>
          </div>

          <!-- Purpose -->
          <div style="background:var(--bgi-surface);border-radius:12px;border:1px solid var(--bgi-border);padding:2px 14px 4px;margin-bottom:10px;">
            <label style="font-size:10px;font-weight:700;color:var(--bgi-text-secondary);display:block;padding-top:4px;letter-spacing:0.5px;text-transform:uppercase;">Purpose of Leave <span style="color:var(--bgi-danger);">*</span></label>
            <ion-textarea id="leave-reason" placeholder="e.g. Family function, Medical emergency..." style="font-size:13px;font-weight:500;color:var(--bgi-text);--padding-top:2px;--padding-bottom:2px;min-height:40px;--placeholder-color:var(--bgi-text-secondary);--placeholder-opacity:0.5;"></ion-textarea>
          </div>

          <!-- Date Range -->
          <div style="margin-bottom:8px;">
            <div style="background:var(--bgi-surface);border-radius:12px;border:1px solid var(--bgi-border);padding:8px 14px 10px;">
              <label style="font-size:10px;font-weight:700;color:var(--bgi-text-secondary);display:block;padding-top:2px;letter-spacing:0.5px;text-transform:uppercase;">Leave Date Range <span style="color:var(--bgi-danger);">*</span></label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
                <div>
                  <div style="font-size:10px;font-weight:600;color:var(--bgi-text-secondary);margin-bottom:4px;">From</div>
                  <ion-input id="from-date-input" style="font-size:13px;font-weight:500;color:var(--bgi-text);--padding-top:0;--padding-bottom:0;--background:var(--bgi-surface);border-radius:8px;border:1px solid var(--bgi-border);margin-bottom:4px;" readonly></ion-input>
                  <ion-datetime id="from-date" presentation="date" style="font-size:13px;font-weight:500;--padding-top:0;--padding-bottom:2px;color:var(--bgi-text);--background:var(--bgi-surface);border-radius:8px;display:block;margin-top:4px;"></ion-datetime>
                  <div id="from-date-display" style="font-size:12px;font-weight:500;color:var(--bgi-text);padding:4px 0 2px;"></div>
                </div>
                <div>
                  <div style="font-size:10px;font-weight:600;color:var(--bgi-text-secondary);margin-bottom:4px;">To</div>
                  <ion-input id="to-date-input" style="font-size:13px;font-weight:500;color:var(--bgi-text);--padding-top:0;--padding-bottom:0;--background:var(--bgi-surface);border-radius:8px;border:1px solid var(--bgi-border);margin-bottom:4px;" readonly></ion-input>
                  <ion-datetime id="to-date" presentation="date" style="font-size:13px;font-weight:500;--padding-top:0;--padding-bottom:2px;color:var(--bgi-text);--background:var(--bgi-surface);border-radius:8px;display:block;margin-top:4px;"></ion-datetime>
                  <div id="to-date-display" style="font-size:12px;font-weight:500;color:var(--bgi-text);padding:4px 0 2px;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Entry/Exit time removed -->

          <!-- Medical Upload -->
          <div style="background:var(--bgi-surface);border-radius:12px;border:1px solid var(--bgi-border);padding:6px 14px 8px;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <label style="font-size:10px;font-weight:700;color:var(--bgi-text-secondary);letter-spacing:0.5px;text-transform:uppercase;">Medical</label>
              <span style="font-size:9px;color:var(--bgi-text-secondary);opacity:0.7;">(Optional)</span>
              <ion-button id="upload-medical-btn" fill="outline" size="small" style="font-size:10px;--padding-start:8px;--padding-end:8px;height:26px;font-weight:600;--border-radius:8px;">
                <ion-icon name="cloud-upload-outline" style="font-size:13px;"></ion-icon> Upload
              </ion-button>
              <span id="medical-file-name" style="font-size:10px;color:var(--bgi-text-secondary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">No file</span>
              <input type="file" id="medical-file-input" accept="image/*,.pdf" style="display:none;" />
              <ion-button id="remove-medical-btn" fill="clear" size="small" style="font-size:14px;color:var(--bgi-danger);display:none;height:24px;min-width:24px;padding:0;">
                <ion-icon name="close-circle" style="font-size:18px;"></ion-icon>
              </ion-button>
            </div>
            <div id="medical-preview" style="display:none;margin-top:6px;border-radius:8px;overflow:hidden;border:1px solid var(--bgi-border);">
              <img id="medical-preview-img" style="width:100%;max-height:70px;object-fit:contain;background:#f5f5f5;" />
            </div>
          </div>

          <div id="apply-error" style="display:none;background:rgba(239,68,68,0.08);border:1px solid var(--bgi-danger);border-radius:10px;padding:8px 12px;margin-bottom:10px;font-size:11px;color:var(--bgi-danger);"></div>

          <ion-button expand="block" id="apply-submit-btn" style="--border-radius:12px;height:42px;font-weight:700;font-size:14px;--box-shadow:0 4px 12px rgba(99,102,241,0.3);margin-top:2px;">
            <ion-icon name="send-outline" slot="start" style="font-size:16px;"></ion-icon> Submit Request
          </ion-button>
        </div>
      </ion-content>
    `;
    document.body.appendChild(modal);
    modal.present();

    let selectedMedicalFile = null;

    // Location refresh in modal
    modal.querySelector('#modal-refresh-location').addEventListener('click', () => {
      this._getUserLocation();
      setTimeout(() => {
        const details = modal.querySelector('#modal-location-details');
        if (this._userLocation) {
          details.textContent = this._userLocation.address || `${this._userLocation.lat.toFixed(6)}, ${this._userLocation.lng.toFixed(6)}`;
          details.style.color = 'var(--bgi-text-secondary)';
        } else {
          details.textContent = 'Location not available';
          details.style.color = 'var(--bgi-danger)';
        }
      }, 500);
    });

    // Toggle Functions
    function togglePicker(pickerId, displayId, arrowId) {
      const picker = modal.querySelector(pickerId);
      const display = modal.querySelector(displayId);
      const arrow = modal.querySelector(arrowId);
      
      if (picker.style.display === 'none') {
        picker.style.display = 'block';
        arrow.name = 'chevron-up-outline';
        setTimeout(() => {
          const datetime = picker.querySelector('ion-datetime');
          if (datetime && datetime.value) {
            const val = datetime.value;
            if (pickerId === '#date-picker-container') {
              const d = new Date(val);
              display.textContent = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            } else {
              const parts = val.split(':');
              const hour = parseInt(parts[0]);
              const minute = parts[1];
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const hour12 = hour % 12 || 12;
              display.textContent = `${hour12}:${minute} ${ampm}`;
            }
          }
        }, 100);
      } else {
        picker.style.display = 'none';
        arrow.name = 'chevron-down-outline';
      }
    }

    // entry/exit pickers removed; only date range pickers remain

    // Set Defaults
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const fromDatePicker = modal.querySelector('#from-date');
    const toDatePicker = modal.querySelector('#to-date');
    if (fromDatePicker) {
      fromDatePicker.value = todayStr;
      const display = modal.querySelector('#from-date-display');
      const input = modal.querySelector('#from-date-input');
      if (display) {
        display.textContent = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      if (input) input.value = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (toDatePicker) {
      toDatePicker.value = todayStr;
      const display = modal.querySelector('#to-date-display');
      const input = modal.querySelector('#to-date-input');
      if (display) {
        display.textContent = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      if (input) input.value = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const defaultTime = `${hh}:${mm}`;
    
    const hour = now.getHours();
    const minute = String(now.getMinutes()).padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const timeDisplay = `${hour12}:${minute} ${ampm}`;

    // entry/exit time fields removed — using date range only

    // Auto-update display
    modal.querySelector('#from-date').addEventListener('ionChange', (e) => {
      const val = e.detail.value;
      if (val) {
        const d = new Date(val);
        const display = modal.querySelector('#from-date-display');
        const input = modal.querySelector('#from-date-input');
        if (display) {
          display.textContent = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        if (input) input.value = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    });

    modal.querySelector('#to-date').addEventListener('ionChange', (e) => {
      const val = e.detail.value;
      if (val) {
        const d = new Date(val);
        const display = modal.querySelector('#to-date-display');
        const input = modal.querySelector('#to-date-input');
        if (display) {
          display.textContent = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        if (input) input.value = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    });

    // no entry/exit time change handlers needed

    // Medical upload
    const fileInput = modal.querySelector('#medical-file-input');
    const fileName = modal.querySelector('#medical-file-name');
    const preview = modal.querySelector('#medical-preview');
    const previewImg = modal.querySelector('#medical-preview-img');
    const removeBtn = modal.querySelector('#remove-medical-btn');

    modal.querySelector('#upload-medical-btn').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      selectedMedicalFile = file;
      fileName.textContent = file.name.substring(0, 20) + (file.name.length > 20 ? '...' : '');
      fileName.style.color = 'var(--bgi-text)';
      fileName.style.fontWeight = '500';
      removeBtn.style.display = 'inline-flex';
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          previewImg.src = ev.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        preview.style.display = 'block';
        previewImg.src = '';
        previewImg.style.display = 'none';
        preview.innerHTML = `<div style="padding:8px;text-align:center;color:var(--bgi-text-secondary);font-size:11px;">📄 ${file.name}</div>`;
      }
    });

    removeBtn.addEventListener('click', () => {
      selectedMedicalFile = null;
      fileInput.value = '';
      fileName.textContent = 'No file';
      fileName.style.color = 'var(--bgi-text-secondary)';
      preview.style.display = 'none';
      removeBtn.style.display = 'none';
      previewImg.style.display = 'block';
      preview.innerHTML = '';
      preview.appendChild(previewImg);
    });

    modal.querySelector('#apply-close-btn').addEventListener('click', () => modal.dismiss());

    modal.querySelector('#apply-submit-btn').addEventListener('click', async () => {
      const reason = modal.querySelector('#leave-reason').value?.trim();
      const facultyName = modal.querySelector('#faculty-name').value?.trim();
      const employeeId = modal.querySelector('#employee-id').value?.trim();
      const facultyDepartment = modal.querySelector('#faculty-department').value?.trim();
      const facultyDesignation = modal.querySelector('#faculty-designation').value?.trim();
      const hodName = modal.querySelector('#hod-name').value?.trim();
      const fromDateVal = modal.querySelector('#from-date').value;
      const toDateVal = modal.querySelector('#to-date').value;
      const errorEl = modal.querySelector('#apply-error');

      if (!reason) { 
        errorEl.style.display = 'block'; 
        errorEl.textContent = '⚠️ Please enter the purpose of leave'; 
        return; 
      }
      if (!fromDateVal || !toDateVal) { 
        errorEl.style.display = 'block'; 
        errorEl.textContent = '⚠️ Please select leave dates'; 
        return; 
      }
      if (new Date(fromDateVal) > new Date(toDateVal)) { 
        errorEl.style.display = 'block'; 
        errorEl.textContent = '⚠️ Start date cannot be later than end date'; 
        return; 
      }

      errorEl.style.display = 'none';
      const btn = modal.querySelector('#apply-submit-btn');
      btn.disabled = true;
      btn.innerHTML = '<ion-spinner style="width:18px;height:18px;"></ion-spinner> Submitting...';

      try {
        const fields = {
          leaveType: 'Other',
          reason,
          purpose: reason,
          fromDate: fromDateVal,
          toDate: toDateVal,
          leaveDate: fromDateVal,
          studentName: facultyName || currentUser.name || '',
          enrollmentNumber: employeeId || currentUser.employeeId || '',
          branch: facultyDepartment || currentUser.department || '',
          semester: facultyDesignation || currentUser.designation || '',
          tgName: hodName,
          emergencyContact: currentUser.phone || ''
        };

        if (this._userLocation) {
          fields.latitude = this._userLocation.lat;
          fields.longitude = this._userLocation.lng;
          fields.locationAccuracy = this._userLocation.accuracy;
          fields.locationTimestamp = this._userLocation.timestamp;
        }

        await Api.postMultipart('/leave/apply', fields, selectedMedicalFile);

        await UI.toast('✅ Leave request submitted!', 'success');
        modal.dismiss();
        this._loadHome();
      } catch (e) {
        errorEl.style.display = 'block';
        errorEl.textContent = e.message || '❌ Failed to apply. Try again.';
        btn.disabled = false;
        btn.innerHTML = '<ion-icon name="send-outline" slot="start" style="font-size:15px;"></ion-icon> Submit Request';
      }
    });
  },

  async _loadRequests() {
    const body = document.getElementById('dash-body');
    const statuses = ['All', 'Pending', 'Approved', 'Rejected'];
    body.innerHTML = `
      <ion-segment value="${this._requestsFilter}" id="requests-segment" scrollable style="--background:var(--bgi-surface);border-radius:12px;padding:2px;margin-bottom:12px;">
        ${statuses.map((s) => `<ion-segment-button value="${s}" style="font-size:12px;--color-selected:var(--bgi-primary);"><ion-label>${s}</ion-label></ion-segment-button>`).join('')}
      </ion-segment>
      <div id="requests-list" class="mt-16"><div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div></div>
    `;
    document.getElementById('requests-segment').addEventListener('ionChange', (e) => {
      this._requestsFilter = e.detail.value;
      this._renderRequestsList();
    });
    await this._renderRequestsList();
  },

  async _renderRequestsList() {
    const list = document.getElementById('requests-list');
    list.innerHTML = `<div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div>`;
    try {
      const res = await Api.get('/leave/my-requests', { status: this._requestsFilter });
      const requests = res.data || [];
      if (requests.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:30px 0;color:var(--bgi-text-secondary);font-size:13px;">📭 No leave requests found</div>`;
        return;
      }
      list.innerHTML = await UI.leaveCardsHtml(requests, { clickableIfApproved: true });
      UI.attachLeaveCardHandlers(list, { onCardClick: (id) => Router.navigate('epass', { leaveRequestId: id }) });
    } catch (e) {
      list.innerHTML = `<p class="empty-state">${UI.escapeHtml(e.message)}</p>`;
    }
  },

  async _loadHistory() {
    const body = document.getElementById('dash-body');
    body.innerHTML = `<div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div>`;
    try {
      const res = await Api.get('/leave/history');
      const requests = res.data || [];
      body.innerHTML = requests.length === 0
        ? `<div style="text-align:center;padding:30px 0;color:var(--bgi-text-secondary);font-size:13px;">📭 No leave history yet</div>`
        : await UI.leaveCardsHtml(requests, { clickableIfApproved: true });
      UI.attachLeaveCardHandlers(body, { onCardClick: (id) => Router.navigate('epass', { leaveRequestId: id }) });
    } catch (e) {
      body.innerHTML = `<p class="empty-state">${UI.escapeHtml(e.message)}</p>`;
    }
  },

  // ===================================================================
  // PROFILE TAB
  // ===================================================================
  async _loadProfile() {
    const body = document.getElementById('dash-body');
    body.innerHTML = `<div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div>`;
    try {
      const user = await Auth.fetchProfile();
      const photoUrl = user.profileImageUrl || user.profile?.photo || '';
      const profileRows = [
        ['Role', 'Faculty'],
        ['Name', user.name || '-'],
        ['Phone', user.phone || '-'],
        ['Email', user.email || '-'],
        ['Campus', user.campus || '-'],
        ['College', user.college || '-'],
        ['Department', user.department || '-'],
        ['Employee ID', user.employeeId || '-'],
        ['Designation', user.designation || '-'],
      ];

      body.innerHTML = `
        <div style="max-width:560px;margin:0 auto;">
          <div style="text-align:center;padding:10px 0 4px;">
            <div style="position:relative;display:inline-block;">
              <div style="width:92px;height:92px;border-radius:50%;background:rgba(var(--bgi-primary-rgb),0.1);display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid var(--bgi-primary);margin:0 auto;">
                ${photoUrl ?
                  `<img src="${UI.escapeHtml(photoUrl)}" style="width:100%;height:100%;object-fit:cover;" id="profile-photo-img" />` :
                  `<ion-icon name="person-circle-outline" style="font-size:46px;color:var(--bgi-primary);"></ion-icon>`
                }
              </div>
              <ion-button id="edit-photo-btn" style="position:absolute;bottom:0;right:-2px;--padding-start:6px;--padding-end:6px;--padding-top:2px;--padding-bottom:2px;--border-radius:50%;--min-height:28px;--min-width:28px;height:28px;width:28px;font-size:12px;--background:var(--bgi-primary);">
                <ion-icon name="camera-outline" style="font-size:14px;color:#fff;"></ion-icon>
              </ion-button>
              <input type="file" id="profile-photo-input" accept="image/*" style="display:none;" />
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
            <ion-button expand="block" fill="outline" id="edit-profile-btn" style="font-size:12px;height:40px;--border-radius:10px;">
              <ion-icon name="create-outline" slot="start" style="font-size:14px;"></ion-icon> Edit
            </ion-button>
            <ion-button expand="block" fill="outline" color="danger" id="logout-btn" style="font-size:12px;height:40px;--border-radius:10px;">
              <ion-icon name="log-out-outline" slot="start" style="font-size:14px;"></ion-icon> Logout
            </ion-button>
          </div>
        </div>
      `;

      document.getElementById('edit-photo-btn').addEventListener('click', () => {
        document.getElementById('profile-photo-input').click();
      });

      document.getElementById('profile-photo-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        this._handleProfilePhotoUpload(file);
      });

      document.getElementById('edit-profile-btn').addEventListener('click', () => {
        this._showEditProfileModal(user);
      });

      document.getElementById('logout-btn').addEventListener('click', () => {
        Auth.logout();
        Router.reset('login');
      });

    } catch (e) {
      body.innerHTML = `<p class="empty-state">${UI.escapeHtml(e.message)}</p>`;
    }
  },

  // ---- Profile Photo Upload ----
  async _handleProfilePhotoUpload(file) {
    try {
      const data = await Api.putMultipart('/auth/profile-photo', {}, file, 'photo');

      const img = document.getElementById('profile-photo-img');
      if (img) {
        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
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

      await UI.toast('Profile photo updated', 'success');
    } catch (e) {
      await UI.toast(e.message || 'Failed', 'danger');
    }
  },

  // ---- Edit Profile Modal ----
  _showEditProfileModal(user) {
    const modal = document.createElement('ion-modal');
    modal.cssText = '--height:auto;--width:100%;--max-height:90%;--border-radius:16px;';
    modal.innerHTML = `
      <ion-header>
        <ion-toolbar style="--background:var(--bgi-primary);--color:#fff;--min-height:44px;">
          <ion-title style="font-size:15px;font-weight:600;">Edit Profile</ion-title>
          <ion-buttons slot="end">
            <ion-button id="edit-profile-close" style="color:#fff;font-size:13px;">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-list lines="none" style="padding:0;">
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Full Name</ion-label>
            <ion-input id="edit-name" value="${UI.escapeHtml(user.name || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Phone</ion-label>
            <ion-input id="edit-phone" type="tel" value="${UI.escapeHtml(user.phone || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Campus</ion-label>
            <ion-input id="edit-campus" value="${UI.escapeHtml(user.campus || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">College</ion-label>
            <ion-input id="edit-college" value="${UI.escapeHtml(user.college || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Department</ion-label>
            <ion-input id="edit-department" value="${UI.escapeHtml(user.department || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Employee ID</ion-label>
            <ion-input id="edit-employeeId" value="${UI.escapeHtml(user.employeeId || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:12px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Designation</ion-label>
            <ion-input id="edit-designation" value="${UI.escapeHtml(user.designation || '')}" style="font-size:13px;"></ion-input>
          </ion-item>
        </ion-list>
        <ion-button expand="block" id="edit-profile-save" style="--border-radius:10px;height:42px;font-size:13px;font-weight:600;--background:var(--bgi-primary);">
          <ion-icon name="save-outline" slot="start" style="font-size:14px;"></ion-icon> Save Changes
        </ion-button>
      </ion-content>
    `;
    document.body.appendChild(modal);
    modal.present();

    modal.querySelector('#edit-profile-close').addEventListener('click', () => modal.dismiss());

    modal.querySelector('#edit-profile-save').addEventListener('click', async () => {
      const name = modal.querySelector('#edit-name').value.trim();
      const phone = modal.querySelector('#edit-phone').value.trim();
      const campus = modal.querySelector('#edit-campus').value.trim();
      const college = modal.querySelector('#edit-college').value.trim();
      const department = modal.querySelector('#edit-department').value.trim();
      const employeeId = modal.querySelector('#edit-employeeId').value.trim();
      const designation = modal.querySelector('#edit-designation').value.trim();

      if (!name) return UI.toast('Name is required', 'warning');

      try {
        const payload = { name, phone, campus, college, department, employeeId, designation };
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

  // ---- Change Password Modal ----
  _showChangePasswordModal() {
    const modal = document.createElement('ion-modal');
    modal.cssText = '--height:auto;--width:100%;--max-height:90%;--border-radius:16px;';
    modal.innerHTML = `
      <ion-header>
        <ion-toolbar style="--background:var(--bgi-primary);--color:#fff;--min-height:44px;">
          <ion-title style="font-size:15px;font-weight:600;">Change Password</ion-title>
          <ion-buttons slot="end">
            <ion-button id="cp-close" style="color:#fff;font-size:13px;">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-list lines="none" style="padding:0;">
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Current Password</ion-label>
            <ion-input id="cp-current" type="password" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">New Password</ion-label>
            <ion-input id="cp-new" type="password" style="font-size:13px;"></ion-input>
          </ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:12px;--min-height:44px;">
            <ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Confirm Password</ion-label>
            <ion-input id="cp-confirm" type="password" style="font-size:13px;"></ion-input>
          </ion-item>
        </ion-list>
        <div id="cp-match-indicator" style="font-size:11px;margin-bottom:10px;display:none;">
          <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
          <span style="color:var(--bgi-success);">Passwords match</span>
        </div>
        <ion-button expand="block" id="cp-submit" style="--border-radius:10px;height:42px;font-size:13px;font-weight:600;--background:var(--bgi-primary);">
          <ion-icon name="key-outline" slot="start" style="font-size:14px;"></ion-icon> Update Password
        </ion-button>
      </ion-content>
    `;
    document.body.appendChild(modal);
    modal.present();

    const newPwd = modal.querySelector('#cp-new');
    const confirmPwd = modal.querySelector('#cp-confirm');
    const indicator = modal.querySelector('#cp-match-indicator');

    if (newPwd && confirmPwd && indicator) {
      const checkMatch = () => {
        if (newPwd.value && confirmPwd.value && newPwd.value === confirmPwd.value) {
          indicator.style.display = 'block';
          indicator.querySelector('span').textContent = 'Passwords match ✅';
          indicator.querySelector('ion-icon').setAttribute('color', 'success');
        } else if (confirmPwd.value) {
          indicator.style.display = 'block';
          indicator.querySelector('span').textContent = 'Passwords do not match ❌';
          indicator.querySelector('ion-icon').setAttribute('color', 'danger');
        } else {
          indicator.style.display = 'none';
        }
      };
      newPwd.addEventListener('ionInput', checkMatch);
      confirmPwd.addEventListener('ionInput', checkMatch);
    }

    modal.querySelector('#cp-close').addEventListener('click', () => modal.dismiss());

    modal.querySelector('#cp-submit').addEventListener('click', async () => {
      const current = modal.querySelector('#cp-current').value;
      const newPwdVal = modal.querySelector('#cp-new').value;
      const confirm = modal.querySelector('#cp-confirm').value;

      if (!current || !newPwdVal || !confirm) return UI.toast('All fields required', 'warning');
      if (newPwdVal !== confirm) return UI.toast('Passwords do not match', 'danger');
      if (newPwdVal.length < 6) return UI.toast('Min 6 characters', 'warning');

      try {
        await Api.put('/auth/change-password', { currentPassword: current, newPassword: newPwdVal });
        await UI.toast('Password changed!', 'success');
        modal.dismiss();
      } catch (e) {
        await UI.toast(e.message || 'Failed', 'danger');
      }
    });
  },
};