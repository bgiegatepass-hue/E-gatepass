// =====================================================================
// E-PASS — App-wide configuration
// =====================================================================

// Point this at your deployed backend (see docs/DEPLOYMENT_GUIDE.md).
// The app now resolves a usable local backend URL automatically for browser,
// Android emulator, and device-based testing.
function resolveBackendBaseUrl() {
  // 🔥 PRODUCTION URL - DIRECT 🔥
  // Backend deployed on Render
  return 'https://e-gatepass-1-pbej.onrender.com/api/v1';
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
};