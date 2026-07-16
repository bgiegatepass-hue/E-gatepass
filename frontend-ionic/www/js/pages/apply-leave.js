// =====================================================================
// E-PASS — Apply Leave Screen
// =====================================================================

Pages['apply-leave'] = {
  _fromDate: null,
  _toDate: null,
  _attachmentFile: null,
  _userLocation: null,

  render() {
    this._fromDate = null;
    this._toDate = null;
    this._attachmentFile = null;

    return `
      <ion-header><ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="#" id="apply-back-btn"></ion-back-button></ion-buttons>
        <ion-title>Apply Leave</ion-title>
      </ion-toolbar></ion-header>
      <ion-content class="ion-padding">
        <p style="font-weight:600;">Leave Type</p>
        <ion-item lines="none" style="border:1px solid var(--bgi-border);border-radius:12px;margin-bottom:18px;">
          <ion-select id="leave-type" interface="action-sheet" value="${APP_CONFIG.leaveTypes[0]}">
            ${APP_CONFIG.leaveTypes.map((t) => `<ion-select-option value="${t}">${t}</ion-select-option>`).join('')}
          </ion-select>
        </ion-item>

        <p style="font-weight:600;">From Date</p>
        <ion-item id="from-date-item" lines="none" style="border:1px solid var(--bgi-border);border-radius:12px;margin-bottom:18px;cursor:pointer;">
          <ion-icon name="calendar-outline" slot="start" color="medium"></ion-icon>
          <ion-label id="from-date-label">Select date</ion-label>
        </ion-item>

        <p style="font-weight:600;">To Date</p>
        <ion-item id="to-date-item" lines="none" style="border:1px solid var(--bgi-border);border-radius:12px;margin-bottom:18px;cursor:pointer;">
          <ion-icon name="calendar-outline" slot="start" color="medium"></ion-icon>
          <ion-label id="to-date-label">Select date</ion-label>
        </ion-item>

        <p style="font-weight:600;">Reason for Leave</p>
        <ion-textarea id="reason-input" rows="4" maxlength="${APP_CONFIG.maxReasonLength}" placeholder="Describe the reason for your leave..."
          style="border:1px solid var(--bgi-border);border-radius:12px;padding:10px;margin-bottom:18px;" counter="true"></ion-textarea>

        <p style="font-weight:600;">Emergency Contact Number</p>
        <ion-item lines="none" style="border:1px solid var(--bgi-border);border-radius:12px;margin-bottom:18px;">
          <ion-icon name="call-outline" slot="start" color="medium"></ion-icon>
          <ion-input id="emergency-contact" type="tel" placeholder="e.g. 9876543210"></ion-input>
        </ion-item>

        <p style="font-weight:600;">Upload Document (Optional)</p>
        <ion-item id="attachment-item" lines="none" style="border:1px solid var(--bgi-border);border-radius:12px;margin-bottom:18px;cursor:pointer;">
          <ion-icon name="attach-outline" slot="start" color="primary"></ion-icon>
          <ion-label id="attachment-label" color="medium">Tap to attach medical certificate / document</ion-label>
        </ion-item>
        <input type="file" id="attachment-file-input" accept=".pdf,.jpg,.jpeg,.png" class="hidden" />

        <div id="location-status" style="background:var(--bgi-surface);border:1px solid var(--bgi-border);border-radius:12px;padding:14px;margin-bottom:18px;min-height:54px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
            <ion-icon id="location-status-icon" name="location-outline" style="font-size:18px;color:var(--bgi-warning);"></ion-icon>
            <div id="location-status-text" style="font-size:13px;color:var(--bgi-text-secondary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Fetching live location...</div>
          </div>
          <ion-button id="retry-location-btn" fill="outline" size="small" style="min-width:72px;--padding-start:10px;--padding-end:10px;">Retry</ion-button>
        </div>

        <ion-button expand="block" id="submit-leave-btn">
          <span id="submit-btn-label">Submit Request</span>
          <ion-spinner name="dots" slot="end" class="hidden" id="submit-spinner"></ion-spinner>
        </ion-button>
      </ion-content>
    `;
  },

  afterRender() {
    document.getElementById('apply-back-btn').addEventListener('click', (e) => { e.preventDefault(); Router.goBack(); });

    document.getElementById('from-date-item').addEventListener('click', () => this._pickDate(true));
    document.getElementById('to-date-item').addEventListener('click', () => this._pickDate(false));

    document.getElementById('attachment-item').addEventListener('click', () => document.getElementById('attachment-file-input').click());
    document.getElementById('attachment-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      this._attachmentFile = file;
      document.getElementById('attachment-label').textContent = file.name;
      document.getElementById('attachment-label').removeAttribute('color');
    });

    document.getElementById('submit-leave-btn').addEventListener('click', () => this._submit());
    document.getElementById('retry-location-btn').addEventListener('click', () => this._getUserLocation());
    this._getUserLocation();
  },

  async _pickDate(isFrom) {
    const alert = document.createElement('ion-alert');
    alert.header = isFrom ? 'Select From Date' : 'Select To Date';
    alert.inputs = [{ name: 'date', type: 'date', value: new Date().toISOString().slice(0, 10) }];
    alert.buttons = [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'OK',
        handler: (data) => {
          const value = data.date;
          if (isFrom) {
            this._fromDate = value;
            document.getElementById('from-date-label').textContent = UI.formatDate(value);
          } else {
            this._toDate = value;
            document.getElementById('to-date-label').textContent = UI.formatDate(value);
          }
        },
      },
    ];
    document.body.appendChild(alert);
    await alert.present();
  },

  async _submit() {
    const leaveType = document.getElementById('leave-type').value;
    const reason = document.getElementById('reason-input').value.trim();
    const emergencyContact = document.getElementById('emergency-contact').value.trim();

    if (!this._fromDate || !this._toDate) return UI.toast('Please select From and To dates', 'danger');
    if (new Date(this._fromDate) > new Date(this._toDate)) return UI.toast('From date cannot be after To date', 'danger');
    if (!reason) return UI.toast('Reason is required', 'danger');
    if (!emergencyContact) return UI.toast('Emergency contact is required', 'danger');

    this._setLoading(true);
    try {
      const fields = { leaveType, fromDate: this._fromDate, toDate: this._toDate, reason, emergencyContact };
      if (this._userLocation) {
        fields.latitude = this._userLocation.lat;
        fields.longitude = this._userLocation.lng;
        fields.locationAccuracy = this._userLocation.accuracy;
        fields.locationTimestamp = this._userLocation.timestamp;
        if (this._userLocation.address) {
          fields.locationAddress = this._userLocation.address;
        }
      }

      await Api.postMultipart('/leave/apply', fields, this._attachmentFile);
      await UI.toast('Leave request submitted successfully', 'success');
      Router.goBack();
    } catch (e) {
      await UI.toast(e.message || 'Failed to submit leave', 'danger');
    } finally {
      this._setLoading(false);
    }
  },

  _setLoading(loading) {
    document.getElementById('submit-leave-btn').disabled = loading;
    document.getElementById('submit-btn-label').classList.toggle('hidden', loading);
    document.getElementById('submit-spinner').classList.toggle('hidden', !loading);
  },

  _getUserLocation() {
    const statusText = document.getElementById('location-status-text');
    const statusIcon = document.getElementById('location-status-icon');
    if (!navigator.geolocation) {
      this._userLocation = null;
      if (statusText) statusText.textContent = 'Geolocation not supported by this browser.';
      if (statusIcon) statusIcon.name = 'alert-circle-outline';
      return;
    }

    if (statusText) statusText.textContent = 'Fetching live location...';
    if (statusIcon) statusIcon.name = 'refresh-outline';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this._userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        };
        if (statusText) {
          statusText.textContent = `Live location captured: ${this._userLocation.lat.toFixed(6)}, ${this._userLocation.lng.toFixed(6)} (±${Math.round(this._userLocation.accuracy)}m)`;
        }
        if (statusIcon) statusIcon.name = 'location';
        this._lookupLocationName();
      },
      (error) => {
        this._userLocation = null;
        if (statusText) {
          statusText.textContent = error.code === 1
            ? 'Location permission denied. Allow location to send real live location.'
            : 'Unable to capture live location. Please try again.';
        }
        if (statusIcon) statusIcon.name = 'alert-circle-outline';
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  },

  async _lookupLocationName() {
    if (!this._userLocation?.lat || !this._userLocation?.lng) return;
    const statusText = document.getElementById('location-status-text');
    if (statusText) statusText.textContent = 'Resolving place name...';

    const name = await Api.reverseGeocode(this._userLocation.lat, this._userLocation.lng);
    if (name) {
      this._userLocation.address = name;
      if (statusText) statusText.textContent = `Live location: ${name}`;
    } else if (statusText) {
      statusText.textContent = `Live location: ${this._userLocation.lat.toFixed(6)}, ${this._userLocation.lng.toFixed(6)}`;
    }
  },
};
