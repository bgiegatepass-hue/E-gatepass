Pages['forgot-password'] = {
  render(params = {}) {
    const role = params.role || 'STUDENT';
    return `
      <ion-content class="ion-padding" fullscreen>
        <div style="max-width:440px;margin:0 auto;padding-top:8px;padding-bottom:40px;">
          <div style="text-align:center;margin-bottom:18px;">
            <img src="assets/images/logo.png" alt="Bansal Group of Institutes" style="width:150px;height:auto;object-fit:contain;display:block;margin:0 auto 14px;" onerror="this.style.display='none';" />
          </div>

          <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
            <ion-button fill="clear" color="medium" shape="round" style="--padding-start:0;--padding-end:0;" id="forgot-back-btn">
              <ion-icon name="arrow-back-outline"></ion-icon>
            </ion-button>
            <div>
              <div style="font-size:12px;color:var(--bgi-text-secondary);text-transform:uppercase;letter-spacing:0.08em;">Account Recovery</div>
              <div style="font-size:22px;font-weight:700;">Forgot Password</div>
            </div>
          </div>

          <div style="background:rgba(var(--bgi-primary-rgb),0.04);border:1px solid rgba(var(--bgi-primary-rgb),0.12);border-radius:16px;padding:16px;margin-bottom:18px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <ion-icon name="mail-outline" style="color:var(--bgi-primary);font-size:22px;"></ion-icon>
              <div style="font-weight:600;color:var(--bgi-primary);">Reset password securely</div>
            </div>
            <div style="font-size:13px;color:var(--bgi-text-secondary);line-height:1.5;">
              Enter your Gmail address, verify the OTP, and create a new password.
            </div>
          </div>

          <ion-item lines="none" style="--background:#fff;border:1px solid var(--bgi-border);border-radius:12px;margin-bottom:12px;">
            <ion-icon name="mail-outline" slot="start" color="medium"></ion-icon>
            <ion-input id="forgot-email" type="email" placeholder="Enter Gmail address"></ion-input>
          </ion-item>

          <ion-button expand="block" id="forgot-send-otp-btn" color="primary" style="--border-radius:12px;--padding-top:14px;--padding-bottom:14px;margin-bottom:12px;">
            <span id="forgot-send-otp-label">Send OTP</span>
            <ion-spinner name="dots" slot="end" class="hidden" id="forgot-send-otp-spinner"></ion-spinner>
          </ion-button>

          <div id="forgot-otp-box" class="hidden">
            <ion-item lines="none" style="--background:#fff;border:1px solid var(--bgi-border);border-radius:12px;margin-bottom:12px;">
              <ion-icon name="keypad-outline" slot="start" color="medium"></ion-icon>
              <ion-input id="forgot-otp" type="tel" maxlength="6" placeholder="Enter 6-digit OTP"></ion-input>
            </ion-item>

            <ion-button expand="block" id="forgot-verify-btn" color="success" style="--border-radius:12px;--padding-top:14px;--padding-bottom:14px;margin-bottom:12px;">
              <span id="forgot-verify-label">Verify OTP</span>
              <ion-spinner name="dots" slot="end" class="hidden" id="forgot-verify-spinner"></ion-spinner>
            </ion-button>
          </div>

          <div id="forgot-password-box" class="hidden">
            <ion-item lines="none" style="--background:#fff;border:1px solid var(--bgi-border);border-radius:12px;margin-bottom:12px;">
              <ion-icon name="lock-closed-outline" slot="start" color="medium"></ion-icon>
              <ion-input id="forgot-new-password" type="password" placeholder="New password"></ion-input>
            </ion-item>

            <ion-item lines="none" style="--background:#fff;border:1px solid var(--bgi-border);border-radius:12px;margin-bottom:14px;">
              <ion-icon name="lock-closed-outline" slot="start" color="medium"></ion-icon>
              <ion-input id="forgot-confirm-password" type="password" placeholder="Confirm password"></ion-input>
            </ion-item>

            <ion-button expand="block" id="forgot-reset-btn" color="primary" style="--border-radius:12px;--padding-top:14px;--padding-bottom:14px;">
              <span id="forgot-reset-label">Reset Password</span>
              <ion-spinner name="dots" slot="end" class="hidden" id="forgot-reset-spinner"></ion-spinner>
            </ion-button>
          </div>

          <div style="text-align:center;margin-top:18px;">
            <ion-text color="primary" style="font-size:12px;cursor:pointer;" id="forgot-back-to-login">Back to login</ion-text>
          </div>
        </div>
      </ion-content>
    `;
  },

  afterRender(params = {}) {
    const role = params.role || 'STUDENT';

    document.getElementById('forgot-back-btn')?.addEventListener('click', () => {
      Router.goBack();
    });

    document.getElementById('forgot-back-to-login')?.addEventListener('click', () => {
      Router.reset('login');
    });

    document.getElementById('forgot-send-otp-btn')?.addEventListener('click', async () => {
      const email = document.getElementById('forgot-email').value.trim();
      if (!email || !email.includes('@')) {
        return UI.toast('Please enter a valid Gmail address', 'danger');
      }

      this._setSendOtpLoading(true);
      try {
        await Api.post('/auth/forgot-password', { email: email.toLowerCase() });
        document.getElementById('forgot-otp-box').classList.remove('hidden');
        document.getElementById('forgot-password-box').classList.add('hidden');
        await UI.toast('OTP sent to your Gmail address', 'success');
      } catch (error) {
        await UI.toast(error.message || 'Failed to send OTP', 'danger');
      } finally {
        this._setSendOtpLoading(false);
      }
    });

    document.getElementById('forgot-verify-btn')?.addEventListener('click', async () => {
      const email = document.getElementById('forgot-email').value.trim();
      const otp = document.getElementById('forgot-otp').value.trim();

      if (!email || !otp || !/^\d{6}$/.test(otp)) {
        return UI.toast('Please enter the 6-digit OTP sent to your Gmail', 'danger');
      }

      this._setVerifyLoading(true);
      try {
        await Api.post('/auth/forgot-password', {
          email: email.toLowerCase(),
          otp,
        });
        document.getElementById('forgot-password-box').classList.remove('hidden');
        await UI.toast('OTP verified successfully', 'success');
      } catch (error) {
        await UI.toast(error.message || 'OTP verification failed', 'danger');
      } finally {
        this._setVerifyLoading(false);
      }
    });

    document.getElementById('forgot-reset-btn')?.addEventListener('click', async () => {
      const email = document.getElementById('forgot-email').value.trim();
      const otp = document.getElementById('forgot-otp').value.trim();
      const newPassword = document.getElementById('forgot-new-password').value;
      const confirmPassword = document.getElementById('forgot-confirm-password').value;

      if (!newPassword || newPassword.length < 6) {
        return UI.toast('New password must be at least 6 characters long', 'danger');
      }
      if (newPassword !== confirmPassword) {
        return UI.toast('Password confirmation does not match', 'danger');
      }
      if (!email || !otp || !/^\d{6}$/.test(otp)) {
        return UI.toast('Please verify the OTP before resetting password', 'danger');
      }

      this._setResetLoading(true);
      try {
        await Api.post('/auth/forgot-password', {
          email: email.toLowerCase(),
          otp,
          password: newPassword,
        });

        const user = await Auth.login(email.toLowerCase(), newPassword, role);
        const dashMap = {
          ADMIN: 'admin-dashboard',
          FACULTY: 'faculty-dashboard',
          HOD: 'hod-dashboard',
          GUARD: 'guard-dashboard',
          DIRECTOR: 'director-dashboard',
          STUDENT: 'student-dashboard'
        };

        await Router.reset(dashMap[user.role] || 'student-dashboard');
        await UI.toast('Password reset successful. You are now logged in.', 'success');
      } catch (error) {
        await UI.toast(error.message || 'Password reset failed', 'danger');
      } finally {
        this._setResetLoading(false);
      }
    });
  },

  _setSendOtpLoading(on) {
    const btn = document.getElementById('forgot-send-otp-btn');
    const label = document.getElementById('forgot-send-otp-label');
    const spinner = document.getElementById('forgot-send-otp-spinner');
    if (btn) btn.disabled = on;
    if (label) label.classList.toggle('hidden', on);
    if (spinner) spinner.classList.toggle('hidden', !on);
  },

  _setVerifyLoading(on) {
    const btn = document.getElementById('forgot-verify-btn');
    const label = document.getElementById('forgot-verify-label');
    const spinner = document.getElementById('forgot-verify-spinner');
    if (btn) btn.disabled = on;
    if (label) label.classList.toggle('hidden', on);
    if (spinner) spinner.classList.toggle('hidden', !on);
  },

  _setResetLoading(on) {
    const btn = document.getElementById('forgot-reset-btn');
    const label = document.getElementById('forgot-reset-label');
    const spinner = document.getElementById('forgot-reset-spinner');
    if (btn) btn.disabled = on;
    if (label) label.classList.toggle('hidden', on);
    if (spinner) spinner.classList.toggle('hidden', !on);
  }
};
