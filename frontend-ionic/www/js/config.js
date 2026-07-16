// =====================================================================
// E-PASS — App-wide configuration
// =====================================================================

// Point this at your deployed backend (see docs/DEPLOYMENT_GUIDE.md).
// The app now resolves a usable local backend URL automatically for browser,
// Android emulator, and device-based testing.
function resolveBackendBaseUrl() {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage?.getItem('epass_backend_url');
      if (stored) return stored;

      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
        return 'http://localhost:5000/api/v1';
      }
      if (host === '10.0.2.2') {
        return 'http://10.0.2.2:5000/api/v1';
      }
      return `http://${host}:5000/api/v1`;
    } catch (_) {
      return 'http://localhost:5000/api/v1';
    }
  }
  return 'http://localhost:5000/api/v1';
}

const APP_CONFIG = {
  baseUrl: resolveBackendBaseUrl(),
  appName: 'E-PASS',
  collegeName: 'Bansal Group of Institutes',
  collegeTagline: 'Bhopal | Indore | Mandideep',
  leaveTypes: ['Medical', 'Personal', 'Family Function', 'Emergency', 'Other'],
  maxReasonLength: 250,

  // 3 campuses — used on the Admin login picker and the registration form
  campuses: [
    { code: 'BIST', label: 'BIST (Bansal Institute of Science & Technology)' },
    { code: 'BIRT', label: 'BIRT (Bansal Institute of Research & Technology)' },
    { code: 'BIRTS', label: 'BIRTS (Bansal Institute of Research Technology & Science)' },
  ],

  // ---- EmailJS (sends the OTP email straight from the browser — no backend mail server needed) ----
  // Get these 3 values from https://dashboard.emailjs.com after creating a free account:
  //   1. "Email Services" tab -> Add Service (e.g. connect your Gmail) -> copy the Service ID
  //   2. "Email Templates" tab -> Create Template using variables {{to_name}}, {{to_email}}, {{otp_code}}
  //      -> copy the Template ID
  //   3. "Account" -> "General" -> copy your Public Key
  emailjs: {
    publicKey: 'FnU10eqISuYJJ0Hdi',
    serviceId: 'service_hsz4h2p',
    templateId: 'template_efbqrro',
  },
};