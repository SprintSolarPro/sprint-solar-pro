/* =====================================================
 Sprint Solar Pro  app.js (merged & cleaned)  patched
 Note: Replace EMBEDDED_AES_KEY_HEX and EMBEDDED_PUBLIC_KEY_PEM with your actual values.
 Also replace PACKAGED_META placeholders with real meta.b64/meta.sig/meta.checksum for each tier build.
===================================================== */

/* ===============================
 Configuration
================================ */
const APP_VERSION = "1.0.0";
const TRIAL_DAYS = 7;
const SALES_FUNNEL_URL = "https://sprintsolar.gumroad.com/l/fmmplr?_gl=1*1t5xgpj*_ga*MTY1NjE3OTQ1NC4xNzY4NDk3NDIw*_ga_6LJN6D94N6*czE3Njg4MzIxOTYkbzQkZzEkdDE3Njg4MzIzNzkkajQyJGwwJGgw";

// ===== Build tier (set per ZIP) =====
// Allowed values: "trial", "standard", "pro_monthly", "pro_yearly", "enterprise"
const BUILD_TIER = "pro_yearly"; // <-- change per ZIP before zipping

/* ===============================
 Currency symbols (declared early to avoid ReferenceError)
================================ */
const CURRENCY_SYMBOLS = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  ZAR: "R",
  AUD: "A$",
  CAD: "C$",
  CNY: "¥"
};

function getCurrencySymbol() {
  const raw = document.getElementById('currencySelector')?.value || 'NGN';
  const code = String(raw).toUpperCase();
  return CURRENCY_SYMBOLS[code] || raw;
}

function formatWithCommas(number) {
  const n = Number(number) || 0;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/* ===============================
 Defensive guard: ensure showPage exists early to avoid ReferenceError from inline onclicks
 If showPage is called before the real implementation is defined, queue the request.
================================ */
if (!window.showPage) {
  window.showPage = function(pageId) {
    if (typeof window.__realShowPage === 'function') {
      try { window.__realShowPage(pageId); } catch (e) { console.warn('showPage proxy immediate call failed', e); }
      return;
    }
    console.warn('showPage called before initialization, queuing:', pageId);
    const queued = function onReady() {
      document.removeEventListener('DOMContentLoaded', onReady);
      if (typeof window.__realShowPage === 'function') {
        try { window.__realShowPage(pageId); } catch (e) { console.warn('showPage queued call failed', e); }
      } else {
        console.warn('showPage still not available after DOMContentLoaded:', pageId);
      }
    };
    document.addEventListener('DOMContentLoaded', queued);
  };
}

/* ===============================
 Embedded crypto artifacts (placeholders)
 Replace these with your actual values before building.
 - AES key must be 32 bytes (hex string) for AES-256-GCM
 - PUBLIC KEY must be PEM encoded RSA public key used to verify meta.sig
================================ */
const EMBEDDED_AES_KEY_HEX = "b9e50fa142efea9fe62a0f55b81b71293e8880f5ebe54f1c7c9f4283799198ff";
const EMBEDDED_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAwqK4EVzzioMeV4mxEKSN
89vdZKOoXIJr+qNKYGsgZjpU2basctYPvXXKnaY+GkoiZapXRHlgyBInBID1YalI
1QnUOGCtK+hTQaSBMySwhWR0CM3/5MbYS9RV1fALx/EvO4b3MXJ87ntUC4hpvHDx
HkO31os4NdyAsMikH9a/h4ND9oFl9Ck7+Js6p4VEI6yWyFxqo6Ul+5JG4HvrTq1h
5YD8aKXg+tgs2EchyN0YV8ONbgYYkXiigk7K7ldtV9E4ibdAsySVW0KtqUC2Wfba
zZkkR2yZdyXdC8p3mniU9u7U4sWGjNytaK9T/J63wTz9r4qwewFLRckZN36Ch76X
KzSpZ6rOyQhMKhShSZS9RKWAktmNZ7gfj+V+1C7SXA4LrjXbwIRyG8IT98hSWkEE
sYe/uMEdwKMlUw03/ZjQVi+j3fKVmvh4SmlR8D4/xq/RkjKTHOH5OA0DiKYr6DX3
ezReP4H9o8NuhJNQ9ZUtRLXkBEQq6/qscTW1FJ9N3q5lAgMBAAE=
-----END PUBLIC KEY-----`;

/* ===============================
 Embedded packaged metadata (Option A)
================================ */
const PACKAGED_META = {
  b64: "eyJpdiI6InJ6eEEySlViS3NnZmJndUsiLCJhdXRoVGFnIjoiRkNxbHFUZ3gweGF1OFdFZWlJeUN3Zz09IiwiY3QiOiJYeHprU0JCSlh2Q3p0RzNhLzl2MmpYeXdJeE5hS0FQR3hFSnE4Yk9HdlFMdTZ1LzNyOWE2bTdFQk1rbFhVQmtYYWQxd1JrekJzczliM0w2aVV6dDQrUklFeDM3aUJlNVRVeGMvaFFNUUZhTmNuOXhqVzZzUGFXNlpQeStmNENlNGJZUzVWSU1RODRqblNjdlVhWmlnVThQWm1ucWFaWTBHbVhHeWRSWWM4SEJ6VU8zdVptZk9IdkNjR0pKTi96Z25EVnExYy80Z2hGVWx0c2x6NkFNZ1p5V0xtdUpId3NCbkpPdWZ2NGxvbVFXM0oxdzc4ZGcvQkQ0RSsrMDVyNkp1VFN3c1BJRzVPZElQOHZ4bFlFYVRVL1hXaWR6WlByMGZLcnhlUkZQQ1hTYUE5YmI2NXVKWWIwQjJTVWM4ZjhsWTZEeFNjUE4wb05TdEdtbld1V1YvYm9vTm5mVFRKNXJidnVsTkNrOGZ0OGhmMGxJbWUxSmhiZkdlNExZMjdCMkxhdVRWQ3luQ2JvRHRrcjdrb0JlSFdTMEsveHRsUnVvVENBK1lwUXE5U0czNGtDY0xQaWN6NGpYT3JSMGFXMExwaHN2ZlNmMzdHVlpGa2FCcnd1VGRkcDBpQlN5ektYYmRCdVNWdUZ6YWoxQTZEOE1ESFY4a2JnQXJjdz09In0=",
  sig: "OprF8ZC3CK/4AZCnTD1lpWU0gENFWeGzQnEE2z4dXpK5B6k+/rDZmtmu8ct9CnO9j5rpVRh1lUfeM5utKyQp2V0g+B93XAR7UM9ZABn8wYp+qO1ZKZXQbY6gREKtJawdnUkNTaPQvNXmcxB9JxrxDMJ58q3mAXAOKDbuRwC1JQ+wnFoJa9Kq5sKHWGlwdp2SETlDgaoBo3x9m7E7Husshzlu64S6kUAjeXjLx72CSOd/IxkAqef/QPYHQRNlB0kMPAdhQSl1kkK9DLBnXnvniSmd/imHfahgv4WjpHj5f7+C456nigWk/ySdDtwuDgRNUlioDde22AzJxwgYqJxftQ==",
  checksum: "b1246fedeade7b61f0582fce21d7c8bcef8f10b03268acc82acd2c17ef0e7424"
};

/* ===============================
 Utility: crypto helpers (Web Crypto)
================================ */
function hexToBytes(hex) {
  if (!hex) return new Uint8Array();
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
async function importAesKeyFromHex(hex) {
  const raw = hexToBytes(hex);
  return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
}
function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----/, '')
                 .replace(/-----END PUBLIC KEY-----/, '')
                 .replace(/\s+/g, '');
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
async function importRsaPublicKey(pem) {
  const spki = pemToArrayBuffer(pem);
  return await crypto.subtle.importKey(
    "spki",
    spki,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}
async function verifyRsaSignature(publicKey, dataUint8, signatureB64) {
  const sig = base64ToBytes(signatureB64);
  return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, sig, dataUint8);
}
function base64ToBytes(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ===============================
 Read and verify packaged metadata
================================ */
async function loadPackagedMetadata() {
  try {
    if (PACKAGED_META && PACKAGED_META.b64 && PACKAGED_META.b64.trim().length > 0) {
      const metaB64 = PACKAGED_META.b64.trim();
      const checksum = PACKAGED_META.checksum ? PACKAGED_META.checksum.trim() : null;
      const sig = PACKAGED_META.sig ? PACKAGED_META.sig.trim() : null;
      const ciphertextPackageStr = atob(metaB64);
      if (checksum) {
        const calc = await sha256Hex(ciphertextPackageStr);
        if (calc !== checksum) {
          console.warn('Embedded meta.checksum mismatch', calc, checksum);
          return null;
        }
      }
      let ciphertextPackage;
      try { ciphertextPackage = JSON.parse(ciphertextPackageStr); } catch (e) { console.warn('Invalid embedded ciphertext package JSON', e); return null; }
      const iv = base64ToBytes(ciphertextPackage.iv);
      const authTag = ciphertextPackage.authTag ? base64ToBytes(ciphertextPackage.authTag) : null;
      const ct = ciphertextPackage.ct ? base64ToBytes(ciphertextPackage.ct) : null;
      let combined;
      if (authTag) {
        combined = new Uint8Array(ct.length + authTag.length);
        combined.set(ct, 0);
        combined.set(authTag, ct.length);
      } else {
        combined = ct;
      }
      const aesKey = await importAesKeyFromHex(EMBEDDED_AES_KEY_HEX);
      let plaintextStr;
      try {
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, aesKey, combined);
        plaintextStr = new TextDecoder().decode(new Uint8Array(decrypted));
      } catch (e) { console.warn('Failed to decrypt packaged metadata', e); return null; }
      let payload;
      try { payload = JSON.parse(plaintextStr); } catch (e) { console.warn('Invalid plaintext JSON', e); return null; }
      const signatureB64 = sig || payload.sig || null;
      const dataObj = payload.data || payload;
      if (!signatureB64) { console.warn('No signature found for packaged metadata'); return null; }
      const publicKey = await importRsaPublicKey(EMBEDDED_PUBLIC_KEY_PEM);
      const dataUint8 = new TextEncoder().encode(JSON.stringify(dataObj));
      const verified = await verifyRsaSignature(publicKey, dataUint8, signatureB64);
      if (!verified) { console.warn('Packaged metadata signature verification failed'); return null; }
      return dataObj;
    }

    const metaB64Resp = await fetch('meta.b64').catch(() => null);
    if (!metaB64Resp || !metaB64Resp.ok) return null;
    const metaB64 = await metaB64Resp.text();
    const checksumResp = await fetch('meta.checksum').catch(() => null);
    const sigResp = await fetch('meta.sig').catch(() => null);
    const checksum = checksumResp && checksumResp.ok ? (await checksumResp.text()).trim() : null;
    const sig = sigResp && sigResp.ok ? (await sigResp.text()).trim() : null;
    const ciphertextPackageStr = atob(metaB64);
    if (checksum) {
      const calc = await sha256Hex(ciphertextPackageStr);
      if (calc !== checksum) {
        console.warn('meta.checksum mismatch', calc, checksum);
        return null;
      }
    }
    let ciphertextPackage;
    try { ciphertextPackage = JSON.parse(ciphertextPackageStr); } catch (e) { console.warn('Invalid ciphertext package JSON', e); return null; }
    const iv = base64ToBytes(ciphertextPackage.iv);
    const authTag = ciphertextPackage.authTag ? base64ToBytes(ciphertextPackage.authTag) : null;
    const ct = ciphertextPackage.ct ? base64ToBytes(ciphertextPackage.ct) : null;
    let combined;
    if (authTag) {
      combined = new Uint8Array(ct.length + authTag.length);
      combined.set(ct, 0);
      combined.set(authTag, ct.length);
    } else {
      combined = ct;
    }
    const aesKey = await importAesKeyFromHex(EMBEDDED_AES_KEY_HEX);
    let plaintextStr;
    try {
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, aesKey, combined);
      plaintextStr = new TextDecoder().decode(new Uint8Array(decrypted));
    } catch (e) { console.warn('Failed to decrypt packaged metadata', e); return null; }
    let payload;
    try { payload = JSON.parse(plaintextStr); } catch (e) { console.warn('Invalid plaintext JSON', e); return null; }
    const signatureB64 = sig || payload.sig || null;
    const dataObj = payload.data || payload;
    if (!signatureB64) { console.warn('No signature found for packaged metadata'); return null; }
    const publicKey = await importRsaPublicKey(EMBEDDED_PUBLIC_KEY_PEM);
    const dataUint8 = new TextEncoder().encode(JSON.stringify(dataObj));
    const verified = await verifyRsaSignature(publicKey, dataUint8, signatureB64);
    if (!verified) { console.warn('Packaged metadata signature verification failed'); return null; }
    return dataObj;
  } catch (e) {
    console.error('loadPackagedMetadata error', e);
    return null;
  }
}

/* ===============================
 Device & License helpers
================================ */
function getDeviceFingerprint() {
  try {
    return btoa(
      navigator.userAgent + '|' +
      screen.width + 'x' + screen.height + '|' +
      (navigator.language || 'en')
    );
  } catch {
    return 'unknown-device';
  }
}
function getLicense() { try { return JSON.parse(localStorage.getItem('ssp_license')); } catch { return null; } }
function saveLicense(data) { try { localStorage.setItem('ssp_license', JSON.stringify(data)); } catch (e) { console.error('saveLicense failed', e); } }
function removeLicense() { localStorage.removeItem('ssp_license'); }
function enforceLicenseDeviceBinding() {
  const lic = getLicense();
  const current = getDeviceFingerprint();
  if (lic && lic.device && lic.device !== current) {
    localStorage.setItem('ssp_license_invalid_device', '1');
  } else {
    localStorage.removeItem('ssp_license_invalid_device');
  }
}
function isLicenseValid() {
  const lic = getLicense();
  if (!lic) return false;
  const now = Date.now();
  if (lic.expiry && now > lic.expiry) return false;
  if (lic.device && lic.device !== getDeviceFingerprint()) return false;
  if (localStorage.getItem('ssp_license_invalid_device') === '1') return false;
  return true;
}
function initTrial() {
  if (getLicense()) return;
  const start = Date.now();
  saveLicense({
    tier: "trial",
    start,
    expiry: start + TRIAL_DAYS * 24 * 60 * 60 * 1000,
    device: getDeviceFingerprint(),
    projectsLimit: 5,
    source: "local",
    licenseId: 'LIC_' + start,
    projectsCreatedTotal: 0
  });
}

/* ===============================
 Project count helpers
================================ */
function adjustProjectCount(delta) {
  try {
    const used = Math.max(0, Number(localStorage.getItem('ssp_projects_count') || 0) + delta);
    localStorage.setItem('ssp_projects_count', String(used));
    if (typeof updateCreateButtonState === 'function') updateCreateButtonState();
    if (typeof updateProjectsBadge === 'function') updateProjectsBadge();
    return used;
  } catch (e) {
    console.error('adjustProjectCount error', e);
    return Number(localStorage.getItem('ssp_projects_count') || 0);
  }
}

function getLicenseLimit() {
  try {
    const lic = JSON.parse(localStorage.getItem('ssp_license') || '{}');
    return Number(lic.projectsLimit || lic.projectLimit || 0);
  } catch { return 0; }
}

function canCreateProject() {
  const used = Number(localStorage.getItem('ssp_projects_count') || 0);
  const limit = getLicenseLimit();
  return !limit || used < limit;
}

function updateCreateButtonState() {
  const used = Number(localStorage.getItem('ssp_projects_count') || 0);
  const limit = getLicenseLimit();
  const newBtn = document.querySelector('button#fileNewBtn, button.new-project-btn, button#createProjectBtn');
  if (newBtn) newBtn.disabled = !!(limit && used >= limit);
}

/* ===============================
 Quote ID counter
================================ */
let quoteCounter = Number(localStorage.getItem('ssp_quote_counter') || 1000);
function getNextQuoteId() {
  quoteCounter = Number(localStorage.getItem('ssp_quote_counter') || quoteCounter || 1000) + 1;
  localStorage.setItem('ssp_quote_counter', String(quoteCounter));
  return `Quotation_${quoteCounter}`;
}

/* ===============================
 Sales funnel
================================ */
function openSalesFunnel() {
  window.open(SALES_FUNNEL_URL, "_blank");
}

/* ===============================
 Developer credential & login
================================ */
function simpleHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16);
}

function setDeveloperCredential() {
  const pwd = document.getElementById('devSetPassword')?.value || '';
  if (!pwd) { alert('Enter a password to set as developer credential'); return; }
  const hashed = simpleHash(pwd);
  localStorage.setItem('ssp_dev_cred', hashed);
  alert('Developer credential saved locally on this device. Use Developer Login to sign in.');
  const el = document.getElementById('devSetPassword'); if (el) el.value = '';
}

function developerLogin() {
  const pwd = document.getElementById('devLoginPassword')?.value || '';
  const stored = localStorage.getItem('ssp_dev_cred');
  if (!stored) { alert('No developer credential set. Set it first in the modal.'); return; }
  if (!pwd) { alert('Enter developer password'); return; }
  const hashed = simpleHash(pwd);
  if (hashed === stored) {
    sessionStorage.setItem('ssp_dev_logged_in', '1');
    closeDevModal();
    updateDevStatusUI();
    enforceTrialRestrictions();
    updateFileMenuState();
    alert('Developer login successful. Full functionality enabled for this session.');
  } else {
    alert('Incorrect developer password');
  }
}

function developerLogout() {
  sessionStorage.removeItem('ssp_dev_logged_in');
  updateDevStatusUI();
  enforceTrialRestrictions();
  updateFileMenuState();
  alert('Developer session ended. Trial restrictions re-applied if applicable.');
}

function isDeveloperLoggedIn() {
  try { return sessionStorage.getItem('ssp_dev_logged_in') === '1'; } catch { return false; }
}

/* ===============================
 License System (Gumroad Native)
================================ */

// Premium check based on unified validity
function isPremiumActive() {
  if (!isLicenseValid()) return false;
  const lic = getLicense();
  return lic.tier && lic.tier !== "trial";
}

// Project limit by tier (fallback if projectsLimit not set)
function getProjectLimit() {
  if (!isLicenseValid()) return 1;
  const lic = getLicense();
  if (typeof lic.projectsLimit === 'number') return lic.projectsLimit;
  // default mapping if not present
  switch (lic.tier) {
    case "trial": return 5;
    case "standard": return 5;
    case "pro_monthly": return Infinity;
    case "pro_yearly": return Infinity;
    case "enterprise": return Infinity;
    default: return 5;
  }
}

/* ===============================
 Gumroad verification (online call)
 Replace product IDs with your actual Gumroad product IDs
================================ */
async function verifyGumroadLicense(key) {
  const productIdMap = {
    trial: null,
    standard: 'GUMROAD_PRODUCT_ID_STANDARD',
    pro_monthly: 'GUMROAD_PRODUCT_ID_PRO_MONTHLY',
    pro_yearly: 'GUMROAD_PRODUCT_ID_PRO_YEARLY',
    enterprise: 'GUMROAD_PRODUCT_ID_ENTERPRISE'
  };

  const productId = productIdMap[BUILD_TIER];
  if (!productId) return { ok: false, reason: 'trial_build' };

  const endpoint = 'https://gumroad.com/api/v2/licenses/verify';
  const body = new URLSearchParams({ product_id: productId, license_key: key });

  let resp;
  try {
    resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
  } catch {
    return { ok: false, reason: 'network_error' };
  }
  if (!resp.ok) return { ok: false, reason: 'http_' + resp.status };

  let data;
  try { data = await resp.json(); } catch { return { ok: false, reason: 'bad_json' }; }

  const success = !!data.success;
  const purchase = data.purchase || {};
  const gumProductId = purchase.product_id || null;

  if (!success || gumProductId !== productId) {
    return { ok: false, reason: 'invalid_or_wrong_product' };
  }

  // Determine expiry for subscriptions (monthly/yearly)
  let expiry = null;
  const sub = purchase.subscription || {};
  if (sub && sub.next_charge_date) {
    const next = new Date(sub.next_charge_date).getTime();
    if (!Number.isNaN(next)) expiry = next;
  }

  // Projects limit by tier (adjust as needed)
  const projectsLimitByTier = {
    standard: 5,
    pro_monthly: Infinity,
    pro_yearly: Infinity,
    enterprise: Infinity
  };

  return {
    ok: true,
    tier: BUILD_TIER,
    expiry,
    projectsLimit: projectsLimitByTier[BUILD_TIER] ?? Infinity
  };
}

/* ===============================
 Activation (online-first, tier-locked)
================================ */
async function activateLicense() {
  const keyInput = document.getElementById("licenseKeyInput");
  const licenseKey = keyInput?.value?.trim();

  if (!licenseKey || licenseKey.length < 8) {
    alert("Please enter a valid Gumroad license key.");
    return;
  }
  if (BUILD_TIER === "trial") {
    alert("This is a Trial build. Activation is not available.");
    return;
  }

  // Online verification with Gumroad
  const result = await verifyGumroadLicense(licenseKey);
  if (!result.ok) {
    const msgMap = {
      trial_build: 'This build cannot be activated.',
      network_error: 'Network error. Please check your internet connection and try again.',
      invalid_or_wrong_product: 'This license key is not valid for this product tier.'
    };
    alert(msgMap[result.reason] || ('Activation failed: ' + result.reason));
    return;
  }

  // Bind to device and tier
  const device = getDeviceFingerprint();
  const now = Date.now();

  const existing = getLicense() || {};
  const license = {
    licenseKeyHash: simpleHash(licenseKey), // store hash, not raw key
    tier: result.tier,                      // must equal BUILD_TIER
    activatedAt: now,
    expiry: result.expiry || null,
    device,
    source: "gumroad",
    licenseId: existing.licenseId || ('LIC_' + now),
    projectsCreatedTotal: Number(existing.projectsCreatedTotal || 0),
    projectsLimit: Number(result.projectsLimit ?? Infinity)
  };

  saveLicense(license);
  enforceLicenseDeviceBinding();
  setPremiumMode(license.tier);
  applyLicenseToUI();
  updateLicenseStatus();

  alert("License activated successfully. Tier: " + result.tier);
}

// Switch to trial (for testing)
function switchToTrial() {
  if (!confirm('Return to trial mode for testing? This will end any developer session for this tab.')) return;
  developerLogout();
  try { localStorage.removeItem('ssp_license'); } catch (e) {}
  initTrial();
  try { syncProjectsToLicense({ archiveInsteadOfDelete: false }); } catch (e) { console.error('switchToTrial sync failed', e); }
  enforceTrialRestrictions();
  updateFileMenuState();
  applyLicenseToUI();
  try {
    const badge = document.getElementById('projectsBadge');
    const lic = (typeof getLicense === 'function') ? getLicense() : JSON.parse(localStorage.getItem('ssp_license')||'{}');
    const tier = lic?.tier || lic?.type || 'trial';
    const showForStandard = (tier === 'standard') || (typeof isDeveloperLoggedIn === 'function' && isDeveloperLoggedIn());
    if (badge) badge.style.display = showForStandard ? (badge.style.display || 'inline-block') : 'none';
  } catch (e) { /* non-fatal */ }

}

/* Developer modal controls */
function openDevModal() { const modal = document.getElementById('devModal'); if (modal) modal.style.display = 'flex'; }
function closeDevModal() { const modal = document.getElementById('devModal'); if (modal) modal.style.display = 'none'; }
function updateDevStatusUI() { const el = document.getElementById('devStatus'); if (!el) return; el.innerText = isDeveloperLoggedIn() ? 'Developer: signed in' : ''; }

/* ===============================
 File dropdown behavior
================================ */
function toggleFileDropdown() {
  const dd = document.getElementById('fileDropdown');
  if (!dd) return;
  dd.classList.toggle('open');
  if (dd.classList.contains('open')) {
    setTimeout(() => document.addEventListener('click', closeFileDropdownOnClickOutside), 10);
  } else {
    document.removeEventListener('click', closeFileDropdownOnClickOutside);
  }
}
function closeFileDropdownOnClickOutside(e) {
  const dd = document.getElementById('fileDropdown');
  if (!dd) return;
  if (!dd.contains(e.target)) {
    dd.classList.remove('open');
    document.removeEventListener('click', closeFileDropdownOnClickOutside);
  }
}

/* ===============================
 SPA Navigation & Branding
================================ */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
  updateBranding();
  updateCurrencySymbol();
  updateFileMenuState();
}

// expose the real implementation so queued calls can be executed
window.__realShowPage = showPage;
window.showPage = showPage;

function resetAll() { location.reload(); }

/* ===============================
 Branding update
================================ */
function updateBranding() {
  const nameInput = document.getElementById('companyName');
  const logoInput = document.getElementById('companyLogoUrl');
  const brandName = document.getElementById('brandName');
  const companyLogo = document.getElementById('companyLogo');

  if (brandName && nameInput) brandName.innerText = nameInput.value || 'Your Company Name';

  if (!companyLogo) return;

  try { companyLogo.crossOrigin = "anonymous"; } catch (e) {}

  // 1) Prefer preload-provided data URI (Electron packaged app with preload)
  try {
    if (window.sspNative && typeof window.sspNative.readAssetAsDataUrl === 'function') {
      const dataUrl = window.sspNative.readAssetAsDataUrl('assets/logo.png');
      if (dataUrl) {
        companyLogo.src = dataUrl;
        console.debug('updateBranding: using preload data URI for logo');
        return;
      }
    }
  } catch (e) {
    console.warn('updateBranding: preload read failed', e);
  }

  // 2) If user provided a URL, use it only if it's not a file:// URL
  const userSrc = (logoInput?.value || '').trim();
  if (userSrc && !userSrc.startsWith('file:///')) {
    companyLogo.src = userSrc;
    console.debug('updateBranding: using user-provided logo src', userSrc);
    return;
  }

  // 3) If the configured fallback is a file:// path, avoid setting it directly (blocked by CORS).
  // Use a small inline SVG placeholder instead to avoid blocked loads and html2canvas failures.
const inlinePlaceholder = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><rect width="100%" height="100%" fill="#ffffff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666" font-size="14">Company Logo</text></svg>');
companyLogo.src = inlinePlaceholder;
  console.debug('updateBranding: using inline SVG placeholder for logo (avoids file:// CORS)');
}

/* ===============================
 Load analysis
================================ */
window.totalEnergyValue = 0;
window.peakLoadValue = 0;

function addRow() {
  const tbody = document.querySelector('#loadTable tbody');
  if (!tbody) return;
  const row = document.createElement('tr');

  const tdAppliance = document.createElement('td');
  const inpAppliance = document.createElement('input');
  inpAppliance.type = 'text';
  inpAppliance.placeholder = 'Appliance';
  tdAppliance.appendChild(inpAppliance);

  const tdQty = document.createElement('td');
  const inpQty = document.createElement('input');
  inpQty.type = 'number'; inpQty.value = 1; inpQty.min = 1;
  tdQty.appendChild(inpQty);

  const tdPower = document.createElement('td');
  const inpPower = document.createElement('input');
  inpPower.type = 'number'; inpPower.value = 0; inpPower.min = 0;
  tdPower.appendChild(inpPower);

  const tdHours = document.createElement('td');
  const inpHours = document.createElement('input');
  inpHours.type = 'number'; inpHours.value = 0; inpHours.min = 0;
  tdHours.appendChild(inpHours);

  const tdEnergy = document.createElement('td');
  tdEnergy.className = 'energy';
  tdEnergy.innerText = '0';

  const tdAction = document.createElement('td');
  tdAction.className = 'action-cell';
  tdAction.setAttribute('data-html2canvas-ignore','true');
  const btnRemove = document.createElement('button');
  btnRemove.type = 'button';
  btnRemove.innerText = 'Remove';
  btnRemove.addEventListener('click', () => { row.remove(); calculateTotal(); });
  tdAction.appendChild(btnRemove);

  row.appendChild(tdAppliance);
  row.appendChild(tdQty);
  row.appendChild(tdPower);
  row.appendChild(tdHours);
  row.appendChild(tdEnergy);
  row.appendChild(tdAction);

  tbody.appendChild(row);

  // attach listeners
  [inpQty, inpPower, inpHours].forEach(i => i.addEventListener('input', calculateTotal));
}

function removeRow(btn) {
  const tr = btn.closest('tr');
  if (tr) { tr.remove(); calculateTotal(); }
}

function attachListeners() {
  document.querySelectorAll('#loadTable input').forEach(i => {
    i.removeEventListener('input', calculateTotal);
    i.addEventListener('input', calculateTotal);
  });
}

function calculateTotal() {
  let total = 0, peak = 0;
  document.querySelectorAll('#loadTable tbody tr').forEach(row => {
    const qty = Number(row.cells[1].querySelector('input').value) || 0;
    const power = Number(row.cells[2].querySelector('input').value) || 0;
    const hours = Number(row.cells[3].querySelector('input').value) || 0;
    const energy = qty * power * hours;
    const energyEl = row.querySelector('.energy');
    if (energyEl) energyEl.innerText = energy.toFixed(2);
    total += energy;
    peak = Math.max(peak, qty * power);
  });
  const totalEl = document.getElementById('totalEnergy');
  if (totalEl) totalEl.innerText = total.toFixed(2);
  window.totalEnergyValue = total;
  window.peakLoadValue = peak;
}

/* ===============================
 Sizing engine
================================ */
let systemQuantities = { inverterQty: 1, batteryQty: 0, panelQty: 0, chargeControllerQty: 0 };

function calculateSizing() {
  // ensure totals are up to date
  calculateTotal();

  const totalEnergy = window.totalEnergyValue; // Wh/day
  const systemVoltage = Number(document.getElementById('systemVoltage')?.value || 48);
  const sunHours = Number(document.getElementById('sunHours')?.value || 5);
  const deratingFactor = Number(document.getElementById('deratingFactor')?.value || 80) / 100;
  const autonomyDays = Number(document.getElementById('autonomyDays')?.value || 2);
  const batteryCapacityUnit = Number(document.getElementById('batteryCapacity')?.value || 200); // Ah per battery
  const panelWatt = Number(document.getElementById('panelWatt')?.value || 550); // W per panel
  const batteryDoD = Number(document.getElementById('batteryDoD')?.value || 80) / 100;
  const batteryVoltage = Number(document.getElementById('batteryVoltage')?.value || 12);

  // Inverter capacity handling:
  // Support either direct inverterCapacity (W) input or inverterKva + inverterPF inputs.
  const inverterKva = Number(document.getElementById('inverterKva')?.value || 0); // optional kVA input
  const inverterPF = Number(document.getElementById('inverterPF')?.value || 0.8); // optional PF input (default 0.8)
  const inverterCapacityInput = Number(document.getElementById('inverterCapacity')?.value || 0); // W input
  // Determine inverterCapacity in watts (real power)
  const inverterCapacity = inverterKva > 0 ? (inverterKva * 1000 * (isFinite(inverterPF) && inverterPF > 0 ? inverterPF : 0.8)) : (inverterCapacityInput > 0 ? inverterCapacityInput : 4000);

  // Basic validations
  // Allow fractional autonomy values (min 0.25 days)
  const safe = (v, min) => (isFinite(v) && v >= min ? v : min);
  const WhPerDay = safe(totalEnergy, 0);
  const Vsys = safe(systemVoltage, 12);
  const Hsun = safe(sunHours, 1);
  const derate = Math.min(Math.max(deratingFactor, 0.5), 1.0);
  const days = safe(autonomyDays, 0.25); // allow fractional days down to 0.25
  const AhUnit = safe(batteryCapacityUnit, 50);
  const Wpanel = safe(panelWatt, 100);
  const DoD = Math.min(Math.max(batteryDoD, 0.5), 0.95);
  const Vbat = safe(batteryVoltage, 12);

  // Inverter sizing (peak load)
  const peakLoadW = window.peakLoadValue || 0;
  const inverterW = Math.ceil(peakLoadW * 1.25); // 25% headroom
  const inverterQty = Math.max(1, Math.ceil(inverterW / inverterCapacity));

  // Battery bank sizing
  // Required energy storage (Wh) = WhPerDay * autonomyDays / DoD
  const requiredWh = (WhPerDay * days) / DoD;

  // Convert required Wh to Ah at system voltage (correct conversion)
  const requiredAhAtSystemV = requiredWh / Vsys;

  // Number of batteries in parallel to meet Ah (assuming series to reach system voltage)
  const seriesCount = Math.ceil(Vsys / Vbat);
  const parallelAhPerString = AhUnit; // Ah per battery (in series string, Ah stays same)
  const stringsNeeded = Math.ceil(requiredAhAtSystemV / parallelAhPerString);
  const batteryQty = Math.max(seriesCount * stringsNeeded, 0);

  // PV array sizing
  // Daily energy from panels = panelWatt * sunHours * derate * panelQty
  const panelQty = Math.ceil(WhPerDay / (Wpanel * Hsun * derate));

  // Charge controller sizing (rough estimate)
  const arrayPowerW = panelQty * Wpanel;
  const arrayCurrentA = arrayPowerW / Vsys;
  const controllerA = Math.ceil(arrayCurrentA * 1.25); // 25% headroom
  const chargeControllerQty = Math.max(1, Math.ceil(controllerA / 60)); // assume 60A controllers

  // Update global quantities
  systemQuantities = {
    inverterQty,
    batteryQty,
    panelQty,
    chargeControllerQty
  };

  // Update UI (if available)
  if (typeof updateSizingUI === 'function') {
    updateSizingUI({
      inverterW,
      batteryQty,
      panelQty,
      controllerA,
      chargeControllerQty,
      seriesCount,
      stringsNeeded
    });
  }

  // Also call finalizeSizingUI for the standard UI updates
  finalizeSizingUI({
    inverterQty: inverterQty,
    totalBatteryQty: batteryQty,
    panelQty,
    totalEnergy: WhPerDay,
    peakLoad: peakLoadW,
    systemVoltage: Vsys,
    batteryVoltage: Vbat,
    batteryCapacityUnit: AhUnit,
    batteryDoD: DoD,
    autonomyDays: days,
    panelWatt: Wpanel
  });
}

/* ===============================
 Sizing UI updates (continuation)
================================ */
function finalizeSizingUI({
  inverterQty,
  totalBatteryQty,
  panelQty,
  totalEnergy,
  peakLoad,
  systemVoltage,
  batteryVoltage,
  batteryCapacityUnit,
  batteryDoD,
  autonomyDays,
  panelWatt
}) {
  // Basic quantities
  const inverterQtyEl = document.getElementById('inverterQtyResult');
  if (inverterQtyEl) inverterQtyEl.innerText = inverterQty;

  const batteryQtyEl = document.getElementById('batteryQty');
  if (batteryQtyEl) batteryQtyEl.innerText = totalBatteryQty;

  const panelQtyEl = document.getElementById('panelQty');
  if (panelQtyEl) panelQtyEl.innerText = panelQty;

  // Daily and peak displays
  const dailyEl = document.getElementById('dailyEnergyDisplay');
  if (dailyEl) dailyEl.innerText = Number(totalEnergy || 0).toFixed(2);

  const peakEl = document.getElementById('peakLoadDisplay');
  if (peakEl) peakEl.innerText = Number(peakLoad || 0).toFixed(2);

  // Battery configuration
  const batterySeries = Math.max(1, Math.floor(systemVoltage / batteryVoltage));
  const batteryParallel = Math.max(1, Math.ceil(totalBatteryQty / batterySeries));
  const batteryConnection = batterySeries === 1 ? "Parallel" : batteryParallel === 1 ? "Series" : "Series-Parallel";

  const batterySeriesEl = document.getElementById('batterySeriesCount');
  const batteryParallelEl = document.getElementById('batteryParallelCount');
  const batteryConnEl = document.getElementById('batteryConnectionType');
  if (batterySeriesEl) batterySeriesEl.innerText = batterySeries;
  if (batteryParallelEl) batteryParallelEl.innerText = batteryParallel;
  if (batteryConnEl) batteryConnEl.innerText = batteryConnection;

  // Runtime targets
  const targetRuntimeHours = autonomyDays * 24;
  const batteryRuntimeTargetEl = document.getElementById('batteryRuntimeTargetHours');
  if (batteryRuntimeTargetEl) batteryRuntimeTargetEl.innerText = targetRuntimeHours.toFixed(1);

  const avgLoadW = Number(totalEnergy || 0) / 24;
  const usableCapacityWh = totalBatteryQty * batteryCapacityUnit * batteryVoltage * batteryDoD;
  const estimatedRuntimeHours = avgLoadW > 0 ? (usableCapacityWh / avgLoadW) : 0;
  const batteryRuntimeEl = document.getElementById('batteryRuntimeHours');
  if (batteryRuntimeEl) batteryRuntimeEl.innerText = estimatedRuntimeHours.toFixed(1);

  // Panel configuration (assume typical panel Vmp ~40V)
  const panelVoltage = 40;
  const panelSeries = Math.max(1, Math.floor(systemVoltage / panelVoltage));
  const panelParallel = Math.max(1, Math.ceil(panelQty / panelSeries));
  const panelConnection = panelSeries === 1 ? "Parallel" : panelParallel === 1 ? "Series" : "Series-Parallel";

  const panelSeriesEl = document.getElementById('panelSeriesCount');
  const panelParallelEl = document.getElementById('panelParallelCount');
  const panelConnEl = document.getElementById('panelConnectionType');
  if (panelSeriesEl) panelSeriesEl.innerText = panelSeries;
  if (panelParallelEl) panelParallelEl.innerText = panelParallel;
  if (panelConnEl) panelConnEl.innerText = panelConnection;

  // Charge controller guidance
  const inverterType = document.getElementById('inverterType')?.value || 'hybrid';
  const chargeControllerEl = document.getElementById('chargeControllerDisplay');
  if (inverterType !== "hybrid") {
    const arrayWatts = panelQty * panelWatt;
    const controllerCurrent = Math.ceil(arrayWatts / systemVoltage);
    if (chargeControllerEl) chargeControllerEl.innerText = `${controllerCurrent} A MPPT recommended`;
  } else {
    if (chargeControllerEl) chargeControllerEl.innerText = "Integrated (Hybrid Inverter)";
  }

  // Cable gauge (very rough)
  const currentEstimate = Math.ceil(Number(peakLoad || 0) / systemVoltage);
  const cableGauge = currentEstimate <= 30 ? "10 AWG" : currentEstimate <= 60 ? "6 AWG" : "4 AWG or larger";
  const cableEl = document.getElementById('cableGaugeDisplay');
  if (cableEl) cableEl.innerText = cableGauge;
}

/* ===============================
 Quotation engine & currency
================================ */
function updateCurrencySymbol() {
  const symbol = getCurrencySymbol();
  const headerEl = document.getElementById('quoteCurrencyHeader');
  const totalHeaderEl = document.getElementById('quoteCurrencyTotalHeader');
  if (headerEl) headerEl.innerText = symbol;
  if (totalHeaderEl) totalHeaderEl.innerText = symbol;
  const mirror = document.getElementById('quoteCurrencyMirror');
  if (mirror) mirror.value = symbol;
  updateQuoteTotalDisplay();
}
function updateQuoteTotalDisplay() {
  const symbol = getCurrencySymbol();
  const quoteTotalEl = document.getElementById('quoteTotal');
  const finalPriceDisplay = document.getElementById('finalPriceDisplay');
  if (finalPriceDisplay && quoteTotalEl) {
    const rawTotal = Number(quoteTotalEl.dataset.raw || quoteTotalEl.value) || 0;
    finalPriceDisplay.innerText = `${symbol} ${formatWithCommas(rawTotal)}`;
  }
}

function addQuoteRow(item = {}) {
  const tbody = document.getElementById('quoteTableBody');
  const totalRow = document.getElementById('quoteTotalRow');
  if (!tbody || !totalRow) return;
  const newRow = document.createElement('tr');

  const tdName = document.createElement('td');
  const inpName = document.createElement('input');
  inpName.type = 'text'; inpName.className = 'quote-item-name'; inpName.value = item.name || '';
  tdName.appendChild(inpName);

  const tdQty = document.createElement('td');
  const inpQty = document.createElement('input');
  inpQty.type = 'number'; inpQty.className = 'quote-item-qty'; inpQty.value = item.qty || 1; inpQty.min = 1;
  tdQty.appendChild(inpQty);

  const tdPrice = document.createElement('td');
  const inpPrice = document.createElement('input');
  inpPrice.type = 'number'; inpPrice.className = 'quote-item-price'; inpPrice.value = item.price || 0; inpPrice.min = 0;
  tdPrice.appendChild(inpPrice);

  const tdTotal = document.createElement('td');
  const inpTotal = document.createElement('input');
  inpTotal.type = 'text'; inpTotal.className = 'quote-item-total'; inpTotal.disabled = true; inpTotal.value = '0.00';
  tdTotal.appendChild(inpTotal);

  const tdAction = document.createElement('td');
  tdAction.className = 'action-cell';
  tdAction.setAttribute('data-html2canvas-ignore','true');
  const btnRemove = document.createElement('button');
  btnRemove.type = 'button';
  btnRemove.innerText = 'Remove';
  btnRemove.addEventListener('click', () => { newRow.remove(); calculateQuoteTotals(); });
  tdAction.appendChild(btnRemove);

  newRow.appendChild(tdName);
  newRow.appendChild(tdQty);
  newRow.appendChild(tdPrice);
  newRow.appendChild(tdTotal);
  newRow.appendChild(tdAction);

  tbody.insertBefore(newRow, totalRow);

  // attach listeners
  inpQty.addEventListener('input', calculateQuoteTotals);
  inpPrice.addEventListener('input', calculateQuoteTotals);

  calculateQuoteTotals();
}

function calculateQuoteTotals() {
  let grandTotal = 0;
  document.querySelectorAll('#quoteTableBody .quote-item-qty').forEach(qtyInput => {
    const row = qtyInput.closest('tr');
    const qty = Number(qtyInput.value) || 0;
    const price = Number(row.querySelector('.quote-item-price').value) || 0;
    const totalEl = row.querySelector('.quote-item-total');
    const total = qty * price;
    if (totalEl) {
      totalEl.dataset.raw = total.toString();
      totalEl.value = formatWithCommas(total);
    }
    grandTotal += total;
  });
  const totalInput = document.getElementById('quoteTotal');
  if (totalInput) {
    totalInput.dataset.raw = grandTotal.toString();
    totalInput.value = formatWithCommas(grandTotal);
  }
  updateQuoteTotalDisplay();
}

function populateQuoteFromSizing() {
  const tbody = document.getElementById('quoteTableBody');
  if (!tbody) return;
  Array.from(tbody.querySelectorAll('tr')).forEach(row => { if (row.id !== 'quoteTotalRow') row.remove(); });

  if (systemQuantities.inverterQty > 0) {
    addQuoteRow({ name: '5kVA Hybrid Inverter', qty: systemQuantities.inverterQty, price: 500000 });
  }
  if (systemQuantities.batteryQty > 0) {
    const batteryType = document.getElementById('batteryType')?.value || 'Battery';
    addQuoteRow({ name: `200Ah ${batteryType} Battery`, qty: systemQuantities.batteryQty, price: 85000 });
  }
  if (systemQuantities.panelQty > 0) {
    addQuoteRow({ name: '550W Mono Solar Panel', qty: systemQuantities.panelQty, price: 150000 });
  }

  const dateEl = document.getElementById('quoteDate');
  const idEl = document.getElementById('quoteIdDisplay');
  if (dateEl) dateEl.innerText = new Date().toLocaleDateString();
  if (idEl) idEl.innerText = getNextQuoteId();

  calculateQuoteTotals();
}

/* ===============================
 Export helpers: hide UI controls before export and restore after
================================ */
function _hideUiForExport() {
  const toHide = [];
  // Elements explicitly marked no-export or data-html2canvas-ignore
  document.querySelectorAll('.no-export, [data-html2canvas-ignore]').forEach(el => {
    if (el.style && el.style.display !== 'none') { toHide.push({ el, prev: el.style.display }); el.style.display = 'none'; }
  });
  // Hide app-level header/footer unless user explicitly marked them as user header/footer
  document.querySelectorAll('.app-header, .app-footer').forEach(el => {
    if (!el.hasAttribute('data-user-header') && !el.hasAttribute('data-user-footer')) {
      if (el.style && el.style.display !== 'none') { toHide.push({ el, prev: el.style.display }); el.style.display = 'none'; }
    }
  });
  return toHide;
}
function _restoreUiAfterExport(hiddenList) {
  if (!Array.isArray(hiddenList)) return;
  hiddenList.forEach(item => { try { item.el.style.display = item.prev || ''; } catch (e) {} });
}

/* ===============================
 PDF Export (clean export: hide UI controls that are not user header/footer)
================================ */

// Sanitize images and backgrounds before html2canvas/html2pdf rendering
function sanitizeForHtml2Canvas() {
  // Ensure all images have crossOrigin and valid src
  document.querySelectorAll('img').forEach(img => {
    try { img.crossOrigin = "anonymous"; } catch (e) {}
    const src = (img.getAttribute('src') || '').trim();
    if (!src || src === 'about:blank' || src.startsWith('file:///')) {
      // Use a tiny inline SVG placeholder (no external load) to avoid blocked file:// loads
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
     '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><rect width="100%" height="100%" fill="#ffffff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666" font-size="14">Company Logo</text></svg>'

      );
    }
  });

  // Remove CSS backgrounds that reference file:///
  document.querySelectorAll('*').forEach(el => {
    try {
      const bg = getComputedStyle(el).backgroundImage || '';
      if (bg && bg.includes('file:///')) {
        el.style.backgroundImage = 'none';
      }
    } catch (e) {}
  });

  // Hide UI controls that should not be captured
  document.querySelectorAll('.no-export, .action-cell, button').forEach(e => {
    if (!e.dataset._html2canvasHidden) {
      e.dataset._html2canvasHidden = e.style.display || '';
      e.style.display = 'none';
    }
  });
}

function restoreAfterHtml2Canvas() {
  document.querySelectorAll('[data-_html2canvasHidden]').forEach(e => {
    try {
      e.style.display = e.dataset._html2canvasHidden || '';
      delete e.dataset._html2canvasHidden;
    } catch (err) {}
  });
}

function _exportQuotePDF_impl() {
  if (typeof html2pdf === "undefined") { alert("PDF library not loaded"); return; }

  const element = document.getElementById("quoteWrapper");
  if (!element) { alert("Nothing to export"); return; }

  // Hide UI chrome that should not appear in export
  const hidden = _hideUiForExport();

  // Ensure user's header/footer (if any) remain. Remove Sprint/app branding specifically
  const sprintBrand = document.getElementById('appBranding');
  const sprintBrandPrev = sprintBrand ? sprintBrand.style.display : null;
  if (sprintBrand) sprintBrand.style.display = 'none';

  // Sanitize images/backgrounds and hide interactive controls
  sanitizeForHtml2Canvas();

  // Options: tuned to avoid cropping and to work in Electron
  const companyNameValue = (document.getElementById('companyName')?.value || 'Quotation').replace(/[\\/:*?"<>|]/g,'');
  const customerName = (document.getElementById('customerName')?.value || 'Customer').replace(/[\\/:*?"<>|]/g,'');
  const pdfOptions = {
    margin: [12, 10, 12, 10], // top, left, bottom, right (mm)
    filename: `${companyNameValue}_Quote_${customerName}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: Math.max(document.documentElement.scrollWidth, element.scrollWidth, 800),
      windowHeight: Math.max(document.documentElement.scrollHeight, element.scrollHeight, 600),
      imageTimeout: 15000
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      before: '#quoteTotalRow',
      avoid: ['.no-export', '.action-cell']
    }
  };

  // Generate PDF
  try {
    html2pdf()
      .set(pdfOptions)
      .from(element)
      .save()
      .then(() => {
        // restore UI
        _restoreUiAfterExport(hidden);
        if (sprintBrand) sprintBrand.style.display = sprintBrandPrev || '';
        restoreAfterHtml2Canvas();
      })
      .catch(err => {
        _restoreUiAfterExport(hidden);
        if (sprintBrand) sprintBrand.style.display = sprintBrandPrev || '';
        restoreAfterHtml2Canvas();
        console.error('PDF export failed', err);
        alert('PDF export failed: ' + (err && err.message ? err.message : 'unknown error'));
      });
  } catch (e) {
    // restore UI on error
    _restoreUiAfterExport(hidden);
    if (sprintBrand) sprintBrand.style.display = sprintBrandPrev || '';
    restoreAfterHtml2Canvas();
    console.error('PDF export failed', e);
    alert('PDF export failed: ' + (e && e.message ? e.message : 'unknown error'));
  }
}

function exportQuotePDF() {
  if (!(isPremiumActive() || isDeveloperLoggedIn())) {
    alert("Export to PDF is disabled in trial mode. Please activate a premium license.");
    return;
  }
  _exportQuotePDF_impl();
}

/* ===============================
 Trial restrictions, watermark, print & share gating
================================ */
function enforceTrialRestrictions() {
  const exportBtn = document.getElementById('exportPdfBtn');
  const printBtn = document.getElementById('printBtn');
  const filePrintMenuBtn = document.getElementById('filePrintMenuBtn');
  const fileShareMenuBtn = document.getElementById('fileShareMenuBtn');
  const watermark = document.getElementById('trialWatermark');
  const licenseBanner = document.getElementById('licenseBanner');
  const enabled = isPremiumActive() || isDeveloperLoggedIn();

  if (!enabled) {
    if (exportBtn) { exportBtn.disabled = true; exportBtn.title = "Export disabled in trial mode"; }
    if (printBtn) { printBtn.disabled = true; printBtn.title = "Print disabled in trial mode"; }
    if (filePrintMenuBtn) { filePrintMenuBtn.disabled = true; filePrintMenuBtn.title = "Premium required"; }
    if (fileShareMenuBtn) { fileShareMenuBtn.disabled = true; fileShareMenuBtn.title = "Premium required"; }
    if (watermark) watermark.style.display = 'block';
    if (licenseBanner) licenseBanner.style.display = 'block';
  } else {
    if (exportBtn) { exportBtn.disabled = false; exportBtn.title = ""; }
    if (printBtn) { printBtn.disabled = false; printBtn.title = ""; }
    if (filePrintMenuBtn) { filePrintMenuBtn.disabled = false; filePrintMenuBtn.title = ""; }
    if (fileShareMenuBtn) { fileShareMenuBtn.disabled = false; fileShareMenuBtn.title = ""; }
    if (watermark) watermark.style.display = 'none';
    if (licenseBanner) licenseBanner.style.display = 'none';
  }
}

function printQuote() {
  if (!(isPremiumActive() || isDeveloperLoggedIn())) {
    alert("Printing is disabled in trial mode. Please activate a premium license.");
    return;
  }

  // Resolve company name safely
  const company =
    document.getElementById('companyName')?.value ||
    document.getElementById('companyNameInput')?.value ||
    '';

  // Apply footer company name (NO Sprint branding)
  const footer = document.querySelector('footer');
  if (footer) {
    footer.setAttribute('data-company', company || '');
    footer.setAttribute('data-brand', ''); // defensive cleanup
  }

  // Hide UI chrome before print (same logic as PDF)
  const hidden = _hideUiForExport();
  try {
    window.print();
  } finally {
    _restoreUiAfterExport(hidden);
  }
}

function shareQuote() {
  if (!(isPremiumActive() || isDeveloperLoggedIn())) {
    alert("Sharing is a premium feature. Upgrade or log in as developer to enable.");
    return;
  }
  const project = exportProjectJSON();
  const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => alert('Share link copied to clipboard'))
      .catch(() => alert('Share link ready: ' + url));
  } else {
    alert('Share link ready: ' + url);
  }
}

function setupPrintInterception() {
  window.addEventListener('beforeprint', function(e) {
    if (!(isPremiumActive() || isDeveloperLoggedIn())) {
      e.preventDefault();
      alert("Printing is disabled in trial mode. Please activate a premium license to print.");
      window.focus();
    }
  });
  const nativePrint = window.print;
  window.print = function() {
    if (!(isPremiumActive() || isDeveloperLoggedIn())) {
      alert("Printing is disabled in trial mode. Please activate a premium license to print.");
      return;
    }
    return nativePrint.call(window);
  };
}

function setupScreenshotMitigation() {
  document.addEventListener('contextmenu', function(e) {
    if (!(isPremiumActive() || isDeveloperLoggedIn())) {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      e.preventDefault();
    }
  });
  document.addEventListener('keydown', async function(e) {
    if (!(isPremiumActive() || isDeveloperLoggedIn())) {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText('');
          }
        } catch {}
      }
    }
  });
}

/* ===============================
 File menu actions (New/Open/Save/Save As/Exit)
================================ */
function updateFileMenuState() {
  const filePrintMenuBtn = document.getElementById('filePrintMenuBtn');
  const fileShareMenuBtn = document.getElementById('fileShareMenuBtn');
  const enabled = isPremiumActive() || isDeveloperLoggedIn();
  if (filePrintMenuBtn) { filePrintMenuBtn.disabled = !enabled; filePrintMenuBtn.title = enabled ? '' : 'Premium required'; }
  if (fileShareMenuBtn) { fileShareMenuBtn.disabled = !enabled; fileShareMenuBtn.title = enabled ? '' : 'Premium required'; }
}

function fileNew() {
  // Prefer the quota-backed creation helper if available
  if (typeof createProjectEntry === 'function') {
    // Prepare a minimal project snapshot for creation (UI is cleared below)
    const projectSnapshot = exportProjectJSON ? exportProjectJSON() : { meta: { id: `P${Date.now()}` }, items: [] };
    const key = createProjectEntry(projectSnapshot);
    if (!key) return; // creation blocked by quota
  } else {
    // Fallback: check existing quota
    if (!canCreateProject()) { alert('Project limit reached. Delete a project or upgrade license to create more.'); return; }
    // increment legacy counter (will be overridden by licenseHelpers if present)
    try { adjustProjectCount(1); } catch (e) { console.error('adjustProjectCount fallback failed', e); }
  }

  if (!confirm('Start a new project? Unsaved changes will be lost.')) return;

  document.querySelectorAll('#loadTable tbody tr').forEach(r => r.remove());
  document.querySelectorAll('#quoteTableBody tr').forEach(r => { if (r.id !== 'quoteTotalRow') r.remove(); });

  addRow();
  calculateQuoteTotals();
  updateBranding();

  try {
    const idEl = document.getElementById('quoteIdDisplay');
    const dateEl = document.getElementById('quoteDate');
    if (idEl) idEl.innerText = getNextQuoteId();
    if (dateEl) dateEl.innerText = new Date().toLocaleDateString();
  } catch (e) { console.error('Failed to set new quote id', e); }
}

function fileOpen() {
  const saved = localStorage.getItem('ssp_project');
  if (!saved) { alert('No saved project found in local storage.'); return; }
  try {
    const project = JSON.parse(saved);
    if (project.meta?.company) {
      const companyEl = document.getElementById('companyName');
      if (companyEl) companyEl.value = project.meta.company;
    }
    const tbody = document.getElementById('quoteTableBody');
    Array.from(tbody.querySelectorAll('tr')).forEach(r => { if (r.id !== 'quoteTotalRow') r.remove(); });
    (project.items || []).forEach(it => addQuoteRow({ name: it.name, qty: it.qty, price: it.price }));
    calculateQuoteTotals();
    alert('Project loaded from local storage.');
  } catch (e) {
    alert('Failed to load project: invalid data.');
  }
}

function fileSave() {
  const project = exportProjectJSON();
  const key = 'ssp_project_' + (project.meta?.id || Date.now());
  try {
    localStorage.setItem(key, JSON.stringify(project));
  } catch (e) {
    console.error('Failed to save project data', e);
    alert('Failed to save project.');
    return;
  }

  try {
    const raw = localStorage.getItem('ssp_projects_list') || '[]';
    const list = JSON.parse(raw);
    const entry = { id: project.meta.id || '', name: project.meta.company || '', savedAt: Date.now(), key };
    const filtered = list.filter(p => p.id !== entry.id && p.key !== entry.key);
    filtered.unshift(entry);
    // Keep list capped to a reasonable number (5 for trial UI, but full list stored)
    localStorage.setItem('ssp_projects_list', JSON.stringify(filtered.slice(0, 100)));
    if (typeof updateProjectsBadge === 'function') updateProjectsBadge();

    // Recalculate project count from list and license limit (do not increment creation quota)
    try {
      const savedList = JSON.parse(localStorage.getItem('ssp_projects_list') || '[]');
      const used = Number(localStorage.getItem('ssp_projects_count') || 0);
      const limit = getLicenseLimit();
      const desired = limit ? Math.min(limit, Math.max(used, savedList.length)) : Math.max(used, savedList.length);
      localStorage.setItem('ssp_projects_count', String(desired));
      if (typeof updateCreateButtonState === 'function') updateCreateButtonState();
    } catch (e) { console.error('sync count after save failed', e); }
  } catch (e) {
    console.error('Failed to register saved project', e);
  }
  alert('Project saved locally.');
}

/* ===============================
 Save As (improved): allow user to choose filename (File System Access API or prompt fallback)
================================ */
async function fileSaveAs() {
  const project = exportProjectJSON();
  const content = JSON.stringify(project, null, 2);
  const suggestedName = (project.meta?.id ? `${project.meta.id}.json` : 'ssp_project.json');

  // Preferred: use File System Access API if available (gives native save dialog and naming)
  if (window.showSaveFilePicker) {
    try {
      const opts = {
        types: [
          {
            description: 'JSON file',
            accept: { 'application/json': ['.json'] }
          }
        ],
        suggestedName
      };
      const handle = await window.showSaveFilePicker(opts);
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      alert('Project saved.');
      return;
    } catch (e) {
      // If user cancels or API fails, fall back to prompt/download
      console.warn('showSaveFilePicker failed or cancelled', e);
    }
  }

  // Fallback: ask user for filename via prompt so they can name the file
  let filename = prompt('Enter filename to save (include .json)', suggestedName);
  if (!filename) {
    // user cancelled; do nothing
    return;
  }
  // sanitize filename minimally
  filename = filename.replace(/[\\/:*?"<>|]/g, '') || suggestedName;

  try {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    alert('Project saved to downloads as ' + filename);
  } catch (e) {
    console.error('fileSaveAs fallback failed', e);
    alert('Failed to save file: ' + (e && e.message ? e.message : 'unknown error'));
  }
}

/* ===============================
 Export project JSON helper
================================ */
function exportProjectJSON() {
  const items = Array.from(document.querySelectorAll('#quoteTableBody tr'))
    .filter(r => r.id !== 'quoteTotalRow')
    .map(r => ({
      name: r.querySelector('.quote-item-name')?.value || '',
      qty: r.querySelector('.quote-item-qty')?.value || '',
      price: r.querySelector('.quote-item-price')?.value || ''
    }));
  const currentId = document.getElementById('quoteIdDisplay')?.innerText || `Quotation_${quoteCounter}`;
  return {
    meta: {
      company: document.getElementById('companyName')?.value || '',
      date: new Date().toISOString(),
      id: currentId
    },
    items,
    totals: { total: document.getElementById('quoteTotal')?.dataset.raw || 0 }
  };
}

function exitApp() {
  if (confirm('Exit application?')) {
    try { window.close(); } catch (e) { alert('Close the tab to exit the app.'); }
  }
}

/* ===============================
 License UI helpers & project registry (remaining parts)
================================ */
function updateUpgradeButton() {
  const btn = document.getElementById('licenseUpgradeBtn');
  if (!btn) return;
  const lic = getLicense();
  if (!lic) {
    btn.innerText = "Activate Premium";
    btn.onclick = openSalesFunnel;
    return;
  }

  if (!isLicenseValid()) {
    btn.innerText = "Renew License";
    btn.onclick = openSalesFunnel;
    return;
  }

  if (lic.tier === "standard") {
    btn.innerText = "Upgrade to Pro";
    btn.onclick = openSalesFunnel;
    return;
  }

  // For Pro/Enterprise tiers
  btn.innerText = "Manage License";
  btn.onclick = openSalesFunnel;
}

/* ===============================
 License status UI
================================ */
function updateLicenseStatus() {
  const lic = getLicense();
  const statusEl = document.getElementById('licenseStatus');
  const expiryEl = document.getElementById('licenseExpiry');
  if (isLicenseValid()) {
    if (statusEl) statusEl.innerText = "Status: Valid (" + (lic?.tier || 'unknown') + ")";
    if (expiryEl) expiryEl.innerText = lic?.expiry ? "Expires: " + new Date(lic.expiry).toLocaleDateString() : "Expires: Never";
  } else {
    if (statusEl) statusEl.innerText = "Status: INVALID or EXPIRED";
    if (expiryEl) expiryEl.innerText = "Please activate a license.";
  }
}

/* ===============================
 Project registry helpers
================================ */
function getSavedProjects() {
  try { return JSON.parse(localStorage.getItem('ssp_projects_list') || '[]'); } catch { return []; }
}

/* ===============================
 Project load / delete
================================ */
function loadProjectByKey(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) { alert('Project not found: ' + key); return; }
    const project = JSON.parse(raw);
    if (project.meta?.company) {
      const companyEl = document.getElementById('companyName');
      if (companyEl) companyEl.value = project.meta.company;
    }
    const tbody = document.getElementById('quoteTableBody');
    Array.from(tbody.querySelectorAll('tr')).forEach(r => { if (r.id !== 'quoteTotalRow') r.remove(); });
    (project.items || []).forEach(it => addQuoteRow({ name: it.name, qty: it.qty, price: it.price }));
    calculateQuoteTotals();
    const idEl = document.getElementById('quoteIdDisplay');
    if (idEl) idEl.innerText = project.meta?.id || '';
    alert('Project loaded: ' + (project.meta?.id || key));
  } catch (e) {
    alert('Failed to load project: ' + e.message);
  }
}
function deleteSavedProject(key) {
  try {
    const rawList = localStorage.getItem('ssp_projects_list') || '[]';
    const list = JSON.parse(rawList);
    const idx = list.findIndex(p => p.key === key);
    if (idx === -1) { alert('Saved project not found in index'); return; }
    localStorage.removeItem(key);
    list.splice(idx, 1);
    localStorage.setItem('ssp_projects_list', JSON.stringify(list));
    // Do NOT decrement creation quota here. Recalculate visible count from list.
    try {
      const savedList = JSON.parse(localStorage.getItem('ssp_projects_list') || '[]');
      const limit = getLicenseLimit();
      const desired = limit ? Math.min(limit, savedList.length) : savedList.length;
      localStorage.setItem('ssp_projects_count', String(desired));
    } catch (e) { console.error('recalc count after delete failed', e); }
    if (typeof updateProjectsBadge === 'function') updateProjectsBadge();
    alert('Project deleted.');
  } catch (e) {
    console.error('deleteSavedProject failed', e);
    alert('Failed to delete project: ' + e.message);
  }
}

/* ===============================
 Projects Badge (dynamic list with delete)
================================ */
(function(){
  function getUsedCount(){ return Number(localStorage.getItem('ssp_projects_count') || 0); }
  function getLimit(){ 
    const lic = JSON.parse(localStorage.getItem('ssp_license') || '{}');
    return Number(lic.projectsLimit || lic.projectLimit || 0);
  }
  function canCreate(){ const limit = getLimit(); const used = getUsedCount(); return !limit || used < limit; }
const style = document.createElement('style');
style.textContent = `
#projectsBadge {
  position: fixed;
  right: 16px;
  top: 72px;
  z-index: 9999;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
}
#projectsBadge .badge {
  background: #0b5fff;
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(11,95,255,0.18);
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  max-width: 260px;
}
.projects-slot .label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.projects-new.disabled { opacity: 0.5; cursor: not-allowed; }

/* Compact counter styling */
#projectsBadge .projects-counter {
  background: transparent;
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;
document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'projectsBadge';
  container.innerHTML = `
    <div class="badge">
      <strong id="projectsBadgeLabel">Projects: 0 / 0</strong>
      <div id="projectsSlots"></div>
    </div>
  `;
  document.body.appendChild(container);

  function renderSlots(){
  const slotsEl = document.getElementById('projectsSlots');
  if (!slotsEl) return;

  // Clear existing content
  slotsEl.innerHTML = '';

  // Read saved projects and counts
  const saved = getSavedProjects();
  const used = getUsedCount();
  const limit = getLimit();

  // Determine license tier and developer override
  const license = (typeof getLicense === 'function') ? getLicense() : JSON.parse(localStorage.getItem('ssp_license')||'{}');
  const tier = (license && (license.tier || license.type)) ? (license.tier || license.type) : 'trial';
  const dev = (typeof isDeveloperLoggedIn === 'function' && isDeveloperLoggedIn());

  // Badge must appear only for Standard tier (developer bypass allowed)
  const showForStandard = (tier === 'standard') || dev;

  // Build compact counter only when allowed
  if (showForStandard) {
    const counter = document.createElement('div');
    counter.className = 'projects-counter';
    counter.style.display = 'flex';
    counter.style.alignItems = 'center';
    counter.style.gap = '8px';
    counter.style.fontWeight = '700';
    counter.style.whiteSpace = 'nowrap';
    counter.innerText = `${used} / ${limit || saved.length || 0}`;
    slotsEl.appendChild(counter);
  }

  // Update label text for accessibility and legacy UI
  const labelEl = document.getElementById('projectsBadgeLabel');
  if (labelEl) labelEl.innerText = `Projects: ${used} / ${limit || saved.length}`;

  const legacyCount = document.getElementById('projectsCount');
  if (legacyCount) legacyCount.innerText = String(used);

  // Final visibility: show only when standard/dev and there is at least one saved or a limit defined
  const shouldShow = showForStandard && (used > 0 || (limit && limit > 0));
  container.style.display = shouldShow ? 'inline-block' : 'none';
}

window.updateProjectsBadge = renderSlots;
renderSlots();

window.addEventListener('storage', function(e){
  if (['ssp_projects_list','ssp_projects_count','ssp_license'].includes(e.key)) renderSlots();
});
})();

/* ===============================
 applyLicenseToUI
================================ */
function applyLicenseToUI() {
  const lic = getLicense();
  const banner = document.getElementById('licenseBanner');
  const licenseStatusEl = document.getElementById('licenseStatus');
  const licenseExpiryEl = document.getElementById('licenseExpiry');
  const licenseTierEl = document.getElementById('licenseTier');

  if (!lic) {
    if (banner) banner.innerText = 'Trial mode. Activate to unlock premium features.';
    if (licenseStatusEl) licenseStatusEl.innerText = 'Status: Trial';
    if (licenseExpiryEl) licenseExpiryEl.innerText = `Expires: ${new Date(Date.now() + TRIAL_DAYS * 864e5).toLocaleDateString()}`;
    if (licenseTierEl) licenseTierEl.innerText = 'trial';
  } else {
    const tier = lic.tier || lic.type || 'trial';
    if (banner) {
      if (tier === 'trial') {
        banner.innerText = `Trial mode expires ${lic.expiry ? new Date(lic.expiry).toLocaleDateString() : 'soon'}.`;
      } else {
        banner.innerText = `Activated: ${tier.toUpperCase()}`;
      }
    }
    if (licenseStatusEl) licenseStatusEl.innerText = `Status: ${isLicenseValid() ? 'Valid' : 'Invalid'} (${tier})`;
    if (licenseExpiryEl) licenseExpiryEl.innerText = lic.expiry ? `Expires: ${new Date(lic.expiry).toLocaleDateString()}` : 'Expires: Never';
    if (licenseTierEl) licenseTierEl.innerText = tier;
  }

  // enforce UI gating
  enforceTrialRestrictions();
  updateFileMenuState();
  updateCreateButtonState();
  if (typeof updateProjectsBadge === 'function') updateProjectsBadge();

  // ensure projects badge visibility follows tier
  try {
    const badge = document.getElementById('projectsBadge');
    const lic2 = (typeof getLicense === 'function') ? getLicense() : JSON.parse(localStorage.getItem('ssp_license')||'{}');
    const tier2 = lic2?.tier || lic2?.type || 'trial';
    const showForTier = (tier2 !== 'trial') || (typeof isDeveloperLoggedIn === 'function' && isDeveloperLoggedIn());
    if (badge) badge.style.display = showForTier ? (badge.style.display || 'inline-block') : 'none';
  } catch (e) { /* non-fatal */ }
}
updateUpgradeButton();

/* ===============================
 Mode setters (trial / premium)
================================ */
function setTrialMode() {
  window.currentTier = 'trial';
  enforceTrialRestrictions();
  updateFileMenuState();
}

function setPremiumMode(tier) {
  window.currentTier = tier;
  enforceTrialRestrictions();
  updateFileMenuState();
}

/* ===============================
 Enforce license on startup
================================ */
function enforceLicenseOnStartup() {
  const lic = getLicense();

  // Trial if no license
  if (!lic) {
    initTrial();
    setTrialMode();
    return;
  }

  // Tier must match build
  if (lic.tier !== BUILD_TIER) {
    removeLicense();
    initTrial();
    setTrialMode();
    return;
  }

  // Device binding
  const currentDevice = getDeviceFingerprint();
  if (lic.device && lic.device !== currentDevice) {
    removeLicense();
    initTrial();
    setTrialMode();
    return;
  }

  // Expiry enforcement
  if (lic.expiry && Date.now() > lic.expiry) {
    removeLicense();
    initTrial();
    setTrialMode();
    alert('Your license has expired. Please re-activate online.');
    return;
  }

  // Valid for this build/device
  setPremiumMode(lic.tier);
}

/* ===============================
 Initialization
================================ */
document.addEventListener('DOMContentLoaded', async () => {
 // --- Replace the synchronous packaged metadata load with a deferred background loader ---
try {
  // Defer packaged metadata verification so DOMContentLoaded isn't blocked by crypto ops
  (async function tryLoadPackagedMetaDeferred() {
    try {
      const packaged = await loadPackagedMetadata();
      if (packaged && !getLicense()) {
        const now = Date.now();
        const expiry = packaged.expiresAt ? new Date(packaged.expiresAt).getTime() : (packaged.expiry ? packaged.expiry : null);
        const license = {
          licenseKey: null,
          tier: (packaged.tier || packaged.type || 'standard').toString().toLowerCase().replace(/\s+/g, '_'),
          activatedAt: now,
          expiry: expiry || null,
          device: getDeviceFingerprint(),
          source: 'packaged',
          licenseId: 'PKG_' + now,
          projectsCreatedTotal: 0,
          projectsLimit: Number(packaged.projectsLimit || packaged.projectLimit || (String(packaged.tier).toLowerCase().includes('standard') ? 5 : Infinity))
        };
        saveLicense(license);
        // Apply UI changes on the main thread
        try { applyLicenseToUI(); updateLicenseStatus(); updateUpgradeButton(); } catch (e) {}
      }
    } catch (err) {
      // Keep this quiet — we already log inside loadPackagedMetadata
      console.warn('Deferred packaged metadata load failed', err);
    }
  })();
} catch (e) {
  console.warn('Failed to schedule packaged metadata loader', e);
}
    // Enforce license state (trial-first, tier/device/expiry)
    enforceLicenseOnStartup();
    enforceLicenseDeviceBinding();

    // UI setup
       // UI setup
    applyLicenseToUI();
    updateLicenseStatus();
    updateUpgradeButton();
    addRow();
    updateBranding();
    updateCurrencySymbol();

    // Sanitize images/backgrounds early so file:/// assets are replaced before html2canvas sees them
    try {
      if (typeof sanitizeForHtml2Canvas === 'function') {
        sanitizeForHtml2Canvas();
        console.debug('Initial sanitizeForHtml2Canvas() executed on DOMContentLoaded');
      }
    } catch (e) {
      console.warn('Initial sanitizeForHtml2Canvas failed', e);
    }

    showPage('home');

    // Sync project count with license limit
    (function syncProjectCount(){
      try {
        const limit = getLicenseLimit();
        const saved = getSavedProjects();
        const used = Number(localStorage.getItem('ssp_projects_count') || 0);
        const desired = limit ? Math.min(limit, Math.max(used, saved.length)) : Math.max(used, saved.length);
        localStorage.setItem('ssp_projects_count', String(desired));
      } catch (e) {
        console.error('syncProjectCount failed', e);
      }
    })();

    setTimeout(() => {
      enforceTrialRestrictions();
      setupPrintInterception();
      setupScreenshotMitigation();
      updateFileMenuState();
      updateDevStatusUI();
      updateCreateButtonState();
      if (typeof updateProjectsBadge === 'function') updateProjectsBadge();
    }, 50);

    // Wire activation button
    document.getElementById('activateLicenseBtn')?.addEventListener('click', activateLicense);

    // Ensure Add Item button sits inline with share/print controls and is excluded from export
    let addItemBtn = document.getElementById('addItemBtn');
    if (!addItemBtn) {
      // Prefer existing toolbar container that holds print/share buttons
      const toolbar = document.getElementById('quoteToolbar') || document.getElementById('quoteControls') || document.getElementById('quoteHeader') || document.getElementById('quoteActions') || document.getElementById('quoteWrapper') || document.body;
      addItemBtn = document.createElement('button');
      addItemBtn.id = 'addItemBtn';
      addItemBtn.type = 'button';
      addItemBtn.className = 'add-item-btn no-export';
      addItemBtn.setAttribute('data-html2canvas-ignore', 'true');
      addItemBtn.innerText = 'Add Item';
      addItemBtn.style.marginLeft = '8px';
      // Try to place it next to print/share buttons if present
      const printBtn = document.getElementById('printBtn');
      const shareBtn = document.getElementById('shareBtn') || document.getElementById('fileShareMenuBtn');
      if (shareBtn && shareBtn.parentNode) {
        shareBtn.parentNode.insertBefore(addItemBtn, shareBtn.nextSibling);
      } else if (printBtn && printBtn.parentNode) {
        printBtn.parentNode.insertBefore(addItemBtn, printBtn.nextSibling);
      } else {
        try { toolbar.appendChild(addItemBtn); } catch (e) {}
      }
    }
    if (addItemBtn) addItemBtn.addEventListener('click', () => addQuoteRow());

  } catch (e) {
    console.error('Initialization error', e);
  }
});


