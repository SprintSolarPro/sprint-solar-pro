/* =========================================================
   Sprint Solar Pro – Licensing Engine (Offline)
   Author: Sprint
   ========================================================= */

const LICENSE_STORAGE_KEY = 'sprint_license_v1';
const INSTALL_ID_KEY = 'sprint_install_id_v1';

/* ---------- Utilities ---------- */
function generateInstallId() {
  return 'INST-' + Math.random().toString(36).slice(2) + Date.now();
}

function getInstallId() {
  let id = localStorage.getItem(INSTALL_ID_KEY);
  if (!id) {
    id = generateInstallId();
    localStorage.setItem(INSTALL_ID_KEY, id);
  }
  return id;
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h.toString();
}

/* ---------- License Core ---------- */
function computeChecksum(lic) {
  const base = [
    lic.licenseKey,
    lic.type,
    lic.issuedAt,
    lic.expiresAt || '',
    lic.projectsLimit || '',
    lic.projectsUsed || 0,
    lic.installId
  ].join('|');
  return simpleHash(base);
}

function saveLicense(license) {
  license.checksum = computeChecksum(license);
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license));
}

function loadLicense() {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!raw) return null;
    const lic = JSON.parse(raw);

    const expected = computeChecksum(lic);
    if (lic.checksum !== expected) {
      console.warn('License tampering detected');
      return null;
    }
    return lic;
  } catch {
    return null;
  }
}

/* ---------- License Creation ---------- */
function createTrialLicense() {
  const now = Date.now();
  const lic = {
    licenseKey: 'TRIAL',
    type: 'TRIAL',
    issuedAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
    projectsLimit: Infinity,
    projectsUsed: 0,
    installId: getInstallId()
  };
  saveLicense(lic);
  return lic;
}

function createDeveloperLicense(userId) {
  const lic = {
    licenseKey: 'DEV-' + simpleHash(userId),
    type: 'DEVELOPER',
    issuedAt: Date.now(),
    expiresAt: null,
    projectsLimit: Infinity,
    projectsUsed: 0,
    installId: getInstallId()
  };
  saveLicense(lic);
  return lic;
}

/* ---------- Access Checks ---------- */
function getActiveLicense() {
  let lic = loadLicense();
  if (!lic) lic = createTrialLicense();

  if (lic.expiresAt && Date.now() > lic.expiresAt) {
    console.warn('License expired');
    return null;
  }

  if (lic.installId !== getInstallId()) {
    console.warn('License moved to another device');
    return null;
  }

  return lic;
}

function canUseFeature(feature) {
  const lic = getActiveLicense();
  if (!lic) return false;

  if (lic.type === 'DEVELOPER') return true;

  const rules = {
    SYSTEM_INPUT: true,
    LOAD: true,
    SIZING_VIEW: lic.type !== 'TRIAL',
    QUOTE: true,
    PRINT: lic.type !== 'TRIAL',
    PDF_EXPORT: lic.type !== 'TRIAL'
  };

  return !!rules[feature];
}

/* ---------- Project Tracking ---------- */
function registerProjectUse() {
  const lic = getActiveLicense();
  if (!lic) return false;

  if (lic.projectsLimit !== Infinity) {
    if (lic.projectsUsed >= lic.projectsLimit) {
      return false;
    }
    lic.projectsUsed += 1;
    saveLicense(lic);
  }
  return true;
}

/* ---------- Public API ---------- */
window.LicenseManager = {
  getActiveLicense,
  canUseFeature,
  registerProjectUse,
  createDeveloperLicense
};
