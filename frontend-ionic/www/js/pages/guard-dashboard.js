// =====================================================================
// E-PASS — Guard Dashboard (scan / verify E-Pass at the gate)
// =====================================================================

Pages['guard-dashboard'] = {
  _activeTab: 'home',

  render() {
    this._activeTab = 'scan';
    return `
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start" style="display:flex;align-items:center;gap:8px;">
            <img src="assets/images/logo.png" alt="Bansal Group of Institutes" style="height:30px;width:auto;margin-left:6px;" />
            <ion-title id="guard-dash-title" style="font-size:16px;padding:0;margin:0;font-weight:600;color:var(--bgi-text);">Scan</ion-title>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content fullscreen class="ion-padding" style="--background:var(--bgi-bg);">
        <div id="guard-dash-body" style="max-width:500px;margin:0 auto;padding-top:10px;"></div>
      </ion-content>
      <ion-tab-bar id="guard-tabbar" style="--background:var(--bgi-surface);border-top:1px solid var(--bgi-border);">
        <ion-tab-button data-tab="scan">
          <ion-icon name="scan-outline" style="font-size:20px;"></ion-icon>
          <ion-label style="font-size:10px;">Scan</ion-label>
        </ion-tab-button>
        <ion-tab-button data-tab="history">
          <ion-icon name="time-outline" style="font-size:20px;"></ion-icon>
          <ion-label style="font-size:10px;">History</ion-label>
        </ion-tab-button>
        <ion-tab-button data-tab="profile">
          <ion-icon name="person-circle-outline" style="font-size:20px;"></ion-icon>
          <ion-label style="font-size:10px;">Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    `;
  },

  afterRender() {
    document.querySelectorAll('#guard-tabbar ion-tab-button').forEach((btn) => {
      btn.addEventListener('click', () => this._switchGuardTab(btn.dataset.tab));
    });
    this._switchGuardTab('scan');
  },

  _switchGuardTab(tab) {
    this._activeTab = tab;
    document.querySelectorAll('#guard-tabbar ion-tab-button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const title = document.getElementById('guard-dash-title');
    if (title) {
      const titles = { scan: 'Scan', history: 'History', profile: 'Profile' };
      title.textContent = titles[tab] || 'Guard Dashboard';
    }

    if (tab === 'scan') this._renderScanTab();
    else if (tab === 'history') this._renderHistoryTab();
    else if (tab === 'profile') this._renderProfileTab();
  },

  _renderScanTab() {
    const body = document.getElementById('guard-dash-body');
    if (!body) return;
    body.innerHTML = `
      <ion-card style="border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin:0 0 16px;">
        <div style="padding:16px;">
          <p style="font-weight:700;font-size:15px;margin:0 0 12px;color:var(--bgi-text);">
            <ion-icon name="scan-outline" style="font-size:20px;vertical-align:middle;margin-right:8px;color:var(--bgi-primary);"></ion-icon>
            Scan QR Code
          </p>
          <ion-button expand="block" id="scan-qr-btn" style="--border-radius:12px;height:48px;font-weight:600;--background:var(--bgi-primary);">
            <ion-icon name="camera-outline" slot="start" style="font-size:18px;"></ion-icon> Open Camera
          </ion-button>
          <p style="font-size:11px;color:var(--bgi-text-secondary);margin:10px 0 0;text-align:center;line-height:1.4;">
            Click "Open Camera" to scan QR code
          </p>
        </div>
      </ion-card>
      <div id="scan-result" style="margin-bottom:16px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 12px;">
        <p style="font-weight:700;font-size:14px;margin:0;color:var(--bgi-text);">Recent Scans</p>
        <ion-button size="small" fill="clear" id="refresh-scans-btn" style="font-size:12px;--padding-start:0;--padding-end:0;">
          <ion-icon name="refresh-outline" slot="icon-only" style="font-size:16px;"></ion-icon>
        </ion-button>
      </div>
      <div id="recent-scans" style="background:var(--bgi-surface);border-radius:12px;border:1px solid var(--bgi-border);padding:4px 0;">
        <div class="text-center" style="padding:20px;"><ion-spinner color="primary"></ion-spinner></div>
      </div>
    `;
    document.getElementById('scan-qr-btn')?.addEventListener('click', () => this._openQRScanner());
    document.getElementById('refresh-scans-btn')?.addEventListener('click', () => this._loadRecentScans());
    this._loadRecentScans();
  },

  _renderHistoryTab() {
    const body = document.getElementById('guard-dash-body');
    if (!body) return;
    body.innerHTML = `
      <div style="padding:4px 0 8px;">
        <p style="font-weight:700;font-size:14px;margin:0 0 12px;color:var(--bgi-text);">Scan History</p>
        <div id="guard-history-list" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    `;
    this._loadGuardHistory(document.getElementById('guard-history-list'));
  },

  _renderProfileTab() {
    const body = document.getElementById('guard-dash-body');
    if (!body) return;
    body.innerHTML = `
      <div id="guard-profile-card" style="margin-bottom:16px;"></div>
    `;
    this._renderGuardProfile();
  },

  async _renderGuardProfile() {
    const container = document.getElementById('guard-profile-card');
    if (!container) return;
    try {
      const user = await Auth.fetchProfile();
      const photoUrl = user.profileImageUrl || '';
      const profileRows = [
        ['Role', 'Guard'],
        ['Name', user.name || '-'],
        ['Phone', user.phone || '-'],
        ['Email', user.email || '-'],
        ['Employee ID', user.employeeId || '-'],
        ['Assigned Gate', user.assignedGate || '-'],
      ];
      container.innerHTML = `
        <ion-card style="border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);margin:0;">
          <div style="padding:14px 14px 8px;text-align:center;">
            <div style="position:relative;display:inline-block;">
              <div style="width:84px;height:84px;border-radius:50%;background:rgba(var(--bgi-primary-rgb),0.1);display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid var(--bgi-primary);margin:0 auto;">
                ${photoUrl ? `<img src="${UI.escapeHtml(photoUrl)}" style="width:100%;height:100%;object-fit:cover;" id="guard-profile-photo-img" />` : `<ion-icon name="person-circle-outline" style="font-size:42px;color:var(--bgi-primary);"></ion-icon>`}
              </div>
              <ion-button id="guard-edit-photo-btn" style="position:absolute;bottom:0;right:-2px;--padding-start:6px;--padding-end:6px;--padding-top:2px;--padding-bottom:2px;--border-radius:50%;--min-height:28px;--min-width:28px;height:28px;width:28px;font-size:12px;--background:var(--bgi-primary);">
                <ion-icon name="camera-outline" style="font-size:14px;color:#fff;"></ion-icon>
              </ion-button>
              <input type="file" id="guard-profile-photo-input" accept="image/*" style="display:none;" />
            </div>
            <p style="font-weight:700;font-size:16px;margin:8px 0 2px;color:var(--bgi-text);">${UI.escapeHtml(user.name || '')}</p>
            <p style="color:var(--bgi-text-secondary);margin:0;font-size:13px;">${UI.escapeHtml(user.email || '')}</p>
            <p style="color:var(--bgi-text-secondary);margin:2px 0 0;font-size:12px;">${user.assignedGate ? UI.escapeHtml(user.assignedGate) : 'Gate not assigned'}</p>
          </div>
          <ion-list lines="inset" style="padding:0;">
            ${profileRows.map(([label, value]) => `
              <ion-item style="font-size:13px;--min-height:38px;">
                <ion-label style="font-weight:500;color:var(--bgi-text-secondary);">${UI.escapeHtml(label)}</ion-label>
                <ion-note slot="end" style="font-weight:500;color:var(--bgi-text);">${UI.escapeHtml(String(value))}</ion-note>
              </ion-item>
            `).join('')}
          </ion-list>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 12px 12px;">
            <ion-button expand="block" fill="outline" id="guard-edit-profile-btn" style="font-size:12px;height:40px;--border-radius:10px;">
              <ion-icon name="create-outline" slot="start" style="font-size:14px;"></ion-icon> Edit
            </ion-button>
            <ion-button expand="block" fill="outline" color="danger" id="guard-profile-logout-btn" style="font-size:12px;height:40px;--border-radius:10px;">
              <ion-icon name="log-out-outline" slot="start" style="font-size:14px;"></ion-icon> Logout
            </ion-button>
          </div>
        </ion-card>
      `;
      document.getElementById('guard-edit-photo-btn').addEventListener('click', () => document.getElementById('guard-profile-photo-input').click());
      document.getElementById('guard-profile-photo-input').addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          const data = await Api.putMultipart('/auth/profile-photo', {}, file, 'photo');
          const img = document.getElementById('guard-profile-photo-img');
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
        } catch (err) { UI.toast(err.message || 'Upload failed', 'danger'); }
      });
      document.getElementById('guard-edit-profile-btn').addEventListener('click', () => this._showGuardProfileModal(user));
      document.getElementById('guard-profile-logout-btn').addEventListener('click', () => { Auth.logout(); Router.reset('login'); });
    } catch (e) { container.innerHTML = `<p class="empty-state" style="font-size:12px;">${UI.escapeHtml(e.message)}</p>`; }
  },

  _showGuardProfileModal(user) {
    const modal = document.createElement('ion-modal');
    modal.cssText = '--height:auto;--width:100%;--max-height:90%;--border-radius:16px;';
    modal.innerHTML = `
      <ion-header>
        <ion-toolbar style="--background:var(--bgi-primary);--color:#fff;--min-height:44px;">
          <ion-title style="font-size:15px;font-weight:600;">Edit Profile</ion-title>
          <ion-buttons slot="end"><ion-button id="guard-edit-profile-close" style="color:#fff;font-size:13px;">Close</ion-button></ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-list lines="none" style="padding:0;">
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;"><ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Full Name</ion-label><ion-input id="guard-edit-name" value="${UI.escapeHtml(user.name || '')}" style="font-size:13px;"></ion-input></ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:8px;--min-height:44px;"><ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Phone</ion-label><ion-input id="guard-edit-phone" type="tel" value="${UI.escapeHtml(user.phone || '')}" style="font-size:13px;"></ion-input></ion-item>
          <ion-item style="border:1px solid var(--bgi-border);border-radius:10px;margin-bottom:12px;--min-height:44px;"><ion-label position="stacked" style="font-size:11px;font-weight:600;color:var(--bgi-text-secondary);">Assigned Gate</ion-label><ion-input id="guard-edit-assignedGate" value="${UI.escapeHtml(user.assignedGate || '')}" style="font-size:13px;"></ion-input></ion-item>
        </ion-list>
        <ion-button expand="block" id="guard-edit-profile-save" style="--border-radius:10px;height:42px;font-size:13px;font-weight:600;--background:var(--bgi-primary);"><ion-icon name="save-outline" slot="start" style="font-size:14px;"></ion-icon> Save Changes</ion-button>
      </ion-content>`;
    document.body.appendChild(modal);
    modal.present();
    modal.querySelector('#guard-edit-profile-close').addEventListener('click', () => modal.dismiss());
    modal.querySelector('#guard-edit-profile-save').addEventListener('click', async () => {
      const name = modal.querySelector('#guard-edit-name').value.trim();
      const phone = modal.querySelector('#guard-edit-phone').value.trim();
      const assignedGate = modal.querySelector('#guard-edit-assignedGate').value.trim();
      if (!name) return UI.toast('Name is required', 'warning');
      try {
        const payload = { name, phone, assignedGate };
        Object.entries(payload).forEach(([key, value]) => { if (!value) delete payload[key]; });
        await Api.put('/auth/me', payload);
        await Auth.fetchProfile();
        await UI.toast('Profile updated!', 'success');
        modal.dismiss();
        this._renderGuardProfile();
      } catch (e) { await UI.toast(e.message || 'Failed', 'danger'); }
    });
  },

  async _openQRScanner() {
    try {
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative) {
        const { BarcodeScanner } = window.Capacitor.Plugins || {};
        if (BarcodeScanner && typeof BarcodeScanner.scan === 'function') {
          const result = await BarcodeScanner.scan();
          if (result?.hasContent) {
            this._verify(result.content);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Native scanner unavailable, falling back to web scanner:', e);
    }

    this._openWebCameraScanner();
  },

  async _openWebCameraScanner() {
    // Create modal for camera scanner
    const modal = document.createElement('ion-modal');
    modal.cssText = '--height:100%;--width:100%;';
    modal.innerHTML = `
      <ion-header>
        <ion-toolbar>
          <ion-title style="font-size:15px;">Scan QR Code</ion-title>
          <ion-buttons slot="end">
            <ion-button id="scanner-close-btn" style="font-size:13px;">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content style="--background:#000;">
        <div style="text-align:center;padding:10px 0;">
          <div id="scanner-container" style="position:relative;width:100%;max-width:500px;margin:0 auto;aspect-ratio:1;background:#0a0a0a;overflow:hidden;display:flex;align-items:center;justify-content:center;border-radius:12px;">
            <video id="scanner-video" style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1);"></video>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:65%;height:65%;border:2px solid rgba(255,255,255,0.6);border-radius:12px;pointer-events:none;box-shadow:0 0 0 9999px rgba(0,0,0,0.3);"></div>
            <div style="position:absolute;top:8%;left:50%;transform:translateX(-50%);color:#fff;font-size:14px;background:rgba(0,0,0,0.6);padding:8px 20px;border-radius:20px;font-weight:500;">
              📷 Position QR in box
            </div>
            <div style="position:absolute;bottom:8%;left:50%;transform:translateX(-50%);display:flex;gap:12px;">
              <div style="width:8px;height:8px;background:#51cf66;border-radius:50%;animation:pulse 1.5s infinite;"></div>
              <span style="color:#fff;font-size:12px;opacity:0.8;">Scanning...</span>
            </div>
          </div>
          <p id="scanner-status" style="color:#aaa;margin-top:12px;font-size:13px;">Tap "Start Camera" to begin</p>
          <ion-button expand="block" id="start-camera-btn" style="margin:10px auto;max-width:300px;--border-radius:12px;height:44px;font-weight:600;">
            <ion-icon name="camera-outline" slot="start"></ion-icon> Start Camera
          </ion-button>
        </div>
      </ion-content>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
      </style>
    `;
    document.body.appendChild(modal);
    await modal.present();
    
    modal.querySelector('#scanner-close-btn').addEventListener('click', () => modal.dismiss());
    
    let stream = null;
    let scanning = false;
    
    const startCamera = async () => {
      const status = modal.querySelector('#scanner-status');
      const startBtn = modal.querySelector('#start-camera-btn');
      startBtn.disabled = true;
      startBtn.textContent = 'Starting...';
      
      try {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
          throw new Error('Camera API not supported in this browser/context');
        }

        const baseConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 640 }
          }
        };

        const constraintsList = [
          baseConstraints,
          { video: { facingMode: 'environment' } },
          { video: { facingMode: 'user' } },
          { video: true },
        ];

        let lastError = null;
        for (const constraints of constraintsList) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!stream) {
          throw lastError || new Error('Unable to start camera');
        }

        const video = modal.querySelector('#scanner-video');
        // Improve autoplay reliability on mobile browsers
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        video.srcObject = stream;
        await video.play();

        status.textContent = '✅ Camera started. Scanning...';
        status.style.color = '#51cf66';
        startBtn.textContent = '✅ Camera Active';
        startBtn.style.setProperty('--background', '#51cf66');

        scanning = true;
        this._startQRScanning(modal, stream, (qrData) => {
          scanning = false;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          if (qrData) {
            setTimeout(() => {
              modal.dismiss();
              this._verify(qrData);
            }, 500);
          }
        });

      } catch (e) {
        console.error('Camera error:', e);
        // Provide clearer messages depending on error types
        const name = e && e.name ? e.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          status.textContent = '❌ Camera permission denied. Please allow camera access in browser/app settings and try again.';
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          status.textContent = '❌ No camera found or the selected camera is not available.';
        } else if (e.message && e.message.indexOf('secure') !== -1) {
          status.textContent = '❌ Camera requires a secure context (HTTPS or localhost).';
        } else {
          status.textContent = '❌ Unable to access camera. Please try again.';
        }
        status.style.color = '#ff6b6b';
        startBtn.disabled = false;
        startBtn.textContent = 'Retry Camera';
        UI.toast(status.textContent, 'warning');
      }
    };
    
    modal.querySelector('#start-camera-btn').addEventListener('click', startCamera);
    setTimeout(startCamera, 500);
    
    modal.addEventListener('ionModalDidDismiss', () => {
      scanning = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    });
  },

  _startQRScanning(modal, stream, onDetected) {
    const video = modal.querySelector('#scanner-video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let scanning = true;
    let frameCount = 0;
    
    const status = modal.querySelector('#scanner-status');
    
    const loadJsQR = () => {
      return new Promise((resolve) => {
        if (typeof jsQR !== 'undefined') {
          resolve(true);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    };
    
    const scanLoop = async () => {
      if (!scanning) return;
      
      if (typeof jsQR === 'undefined') {
        await loadJsQR();
        if (typeof jsQR === 'undefined') {
          status.textContent = '⚠️ Loading QR library...';
          setTimeout(scanLoop, 100);
          return;
        }
      }
      
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          
          frameCount++;
          if (frameCount % 30 === 0) {
            status.textContent = '🔍 Scanning...';
          }
          
          if (code && code.data && code.data.length > 5) {
            scanning = false;
            status.textContent = '✅ QR Code detected!';
            status.style.color = '#51cf66';
            if (onDetected) onDetected(code.data);
            return;
          }
        } catch (e) {}
      }
      
      requestAnimationFrame(scanLoop);
    };
    
    scanLoop();
  },

  async _verify(passId) {
    if (!passId) return UI.toast('No QR code detected', 'danger');

    const resultDiv = document.getElementById('scan-result');
    resultDiv.innerHTML = `<div class="text-center" style="padding:20px;"><ion-spinner color="primary"></ion-spinner></div>`;
    
    try {
      const res = await Api.post('/guard/scan', { passId });
      const d = res.data;
      const validColor = d.isCurrentlyValid ? 'var(--bgi-success)' : 'var(--bgi-danger)';
      const validIcon = d.isCurrentlyValid ? 'checkmark-circle' : 'close-circle';
      const validLabel = d.isCurrentlyValid ? '✅ Valid — Currently within leave dates' : '❌ Outside valid leave dates';

      resultDiv.innerHTML = `
        <ion-card style="border-radius:16px;border-left:4px solid ${validColor};margin:0;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <div style="padding:16px;text-align:center;">
            <ion-icon name="${validIcon}" style="font-size:44px;color:${validColor};display:block;margin:0 auto 8px;"></ion-icon>
            <p style="font-weight:700;color:${validColor};margin:0 0 12px;font-size:14px;">${validLabel}</p>
            <div style="background:var(--bgi-bg);border-radius:10px;padding:12px;text-align:left;">
              <p style="font-weight:700;font-size:16px;margin:0 0 2px;">${UI.escapeHtml(d.studentName)}</p>
              <p style="color:var(--bgi-text-secondary);margin:0 0 8px;font-size:13px;">${UI.escapeHtml(d.rollNumber)} ${d.branch ? '&bull; ' + UI.escapeHtml(d.branch) : ''}</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:13px;">
                <span style="color:var(--bgi-text-secondary);"><b>Leave Type:</b></span>
                <span>${UI.escapeHtml(d.leaveType)}</span>
                <span style="color:var(--bgi-text-secondary);"><b>Valid:</b></span>
                <span>${UI.formatDate(d.validFrom)} - ${UI.formatDate(d.validTo)}</span>
                ${d.approvedByName ? `
                  <span style="color:var(--bgi-text-secondary);"><b>Approved By:</b></span>
                  <span>${UI.escapeHtml(d.approvedByName)}</span>
                ` : ''}
                ${d.approvedAt ? `
                  <span style="color:var(--bgi-text-secondary);"><b>Approved At:</b></span>
                  <span>${UI.escapeHtml(new Date(d.approvedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</span>
                ` : ''}
                ${typeof d.remainingScans !== 'undefined' ? `
                  <span style="color:var(--bgi-text-secondary);"><b>Remaining Scans:</b></span>
                  <span>${d.remainingScans}</span>
                ` : ''}
                ${d.validUntil ? `
                  <span style="color:var(--bgi-text-secondary);"><b>QR Expires:</b></span>
                  <span>${UI.formatDate(d.validUntil)} ${new Date(d.validUntil).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                ` : ''}
              </div>
            </div>
          </div>
        </ion-card>
      `;
      this._loadRecentScans();
    } catch (e) {
      resultDiv.innerHTML = `
        <ion-card style="border-radius:16px;border-left:4px solid var(--bgi-danger);margin:0;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <div style="padding:16px;text-align:center;">
            <ion-icon name="close-circle" style="font-size:44px;color:var(--bgi-danger);display:block;margin:0 auto 8px;"></ion-icon>
            <p style="font-weight:700;color:var(--bgi-danger);margin:0;font-size:14px;">${UI.escapeHtml(e.message || 'Invalid pass')}</p>
          </div>
        </ion-card>
      `;
    }
  },

  async _loadRecentScans() {
    const list = document.getElementById('recent-scans');
    if (!list) return;
    
    try {
      const res = await Api.get('/guard/scans/recent');
      const scans = res.data || [];
      
      if (scans.length === 0) {
        list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--bgi-text-secondary);font-size:13px;">No scans yet</div>`;
        return;
      }
      
      list.innerHTML = scans.map((s) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--bgi-border);">
          <ion-icon name="${s.action === 'GATE_SCAN' ? 'checkmark-circle-outline' : 'close-circle-outline'}"
            style="font-size:18px;color:${s.action === 'GATE_SCAN' ? 'var(--bgi-success)' : 'var(--bgi-danger)'};flex-shrink:0;"></ion-icon>
          <div style="flex:1;min-width:0;">
            <p style="font-size:12px;font-weight:500;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escapeHtml(s.details?.passId || '-')}</p>
            <p style="font-size:10px;color:var(--bgi-text-secondary);margin:2px 0 0;">${s.details?.studentName ? UI.escapeHtml(s.details.studentName) : ''}</p>
          </div>
          <ion-note style="font-size:10px;color:var(--bgi-text-secondary);flex-shrink:0;">${UI.formatDate(s.createdAt)}</ion-note>
        </div>
      `).join('');
    } catch (e) {
      list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--bgi-danger);font-size:13px;">${UI.escapeHtml(e.message)}</div>`;
    }
  },

  async _showHistory() {
    const modal = document.createElement('ion-modal');
    modal.cssText = '--height:90%;--width:96%;';
    modal.innerHTML = `
      <ion-header>
        <ion-toolbar>
          <ion-title style="font-size:15px;">Scan History</ion-title>
          <ion-buttons slot="end">
            <ion-button id="history-close-btn" style="font-size:13px;">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content style="--background:var(--bgi-bg);padding:12px;">
        <div id="history-list" style="max-width:700px;margin:0 auto;">
          <div class="text-center" style="padding:20px;"><ion-spinner color="primary"></ion-spinner></div>
        </div>
      </ion-content>
    `;
    document.body.appendChild(modal);
    await modal.present();
    modal.querySelector('#history-close-btn').addEventListener('click', () => modal.dismiss());

    const list = modal.querySelector('#history-list');
    await this._loadGuardHistory(list);

    modal.addEventListener('ionModalDidDismiss', () => modal.remove());
  },

  async _loadGuardHistory(container) {
    if (!container) return;
    container.innerHTML = `<div class="text-center" style="padding:20px;"><ion-spinner color="primary"></ion-spinner></div>`;

    try {
      const res = await Api.get('/guard/scans/recent');
      const scans = res.data || [];
      if (scans.length === 0) {
        container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--bgi-text-secondary);font-size:13px;">No scans yet</div>`;
        return;
      }

      container.innerHTML = scans.map((s) => {
        const label = s.action === 'GATE_SCAN' ? 'Success' : 'Failed';
        const color = s.action === 'GATE_SCAN' ? 'var(--bgi-success)' : 'var(--bgi-danger)';
        return `
          <ion-card style="margin-bottom:10px;border-radius:12px;">
            <div style="padding:12px;display:flex;gap:12px;align-items:flex-start;">
              <ion-icon name="${s.action === 'GATE_SCAN' ? 'checkmark-circle' : 'close-circle'}" style="font-size:26px;color:${color};flex-shrink:0;margin-top:2px;"></ion-icon>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                  <div style="font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escapeHtml(s.details?.passId || '-')}</div>
                  <div style="font-size:12px;color:var(--bgi-text-secondary);">${label} • ${UI.formatDate(s.createdAt)}</div>
                </div>
                <div style="margin-top:8px;color:var(--bgi-text-secondary);font-size:13px;line-height:1.4;">
                  ${s.details?.studentName ? `<div><b>Student:</b> ${UI.escapeHtml(s.details.studentName)}</div>` : ''}
                  ${s.details?.approvedByName ? `<div><b>Approved By:</b> ${UI.escapeHtml(s.details.approvedByName)}</div>` : ''}
                  ${s.details?.approvedAt ? `<div><b>Approved At:</b> ${UI.escapeHtml(new Date(s.details.approvedAt).toLocaleString('en-IN'))}</div>` : ''}
                  ${typeof s.details?.scanCount !== 'undefined' ? `<div><b>Scan Count:</b> ${s.details.scanCount}</div>` : ''}
                  ${typeof s.details?.remainingScans !== 'undefined' ? `<div><b>Remaining Scans:</b> ${s.details.remainingScans}</div>` : ''}
                </div>
              </div>
            </div>
          </ion-card>
        `;
      }).join('');
    } catch (e) {
      container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--bgi-danger);font-size:13px;">${UI.escapeHtml(e.message)}</div>`;
    }
  },
};