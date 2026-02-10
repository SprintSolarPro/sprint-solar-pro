/* licenseHelpers.js
   Defensive helper to apply local license state to the UI.
   Works with the unified license model used in app.js:
   { licenseKey, tier, activatedAt, expiry, device, projectsLimit, source }
*/
(function () {
  'use strict';

  // Use the same fingerprint function as app.js if available, otherwise provide a local fallback
  function _getDeviceFingerprint() {
    if (typeof getDeviceFingerprint === 'function') {
      try { return getDeviceFingerprint(); } catch (e) { /* fallthrough */ }
    }
    try {
      return btoa(navigator.userAgent + '|' + screen.width + 'x' + screen.height + '|' + (navigator.language || 'en'));
    } catch (e) {
      return 'unknown-device';
    }
  }

  /* Local storage helpers (consistent names with app.js) */
  function getLicenseLocal() {
    try { return JSON.parse(localStorage.getItem('ssp_license')); } catch { return null; }
  }
  function saveLicenseLocal(lic) {
    try { localStorage.setItem('ssp_license', JSON.stringify(lic)); } catch (e) { console.error('saveLicenseLocal failed', e); }
  }
  function removeLicenseLocal() {
    try { localStorage.removeItem('ssp_license'); } catch (e) { console.error('removeLicenseLocal failed', e); }
  }

  // Expose clear function for UI if needed
  if (!window.clearLicenseLocal) window.clearLicenseLocal = removeLicenseLocal;

  /* Map license to features (unified on tier) */
  function enabledFeaturesFromLicense(lic) {
    if (!lic) return { export: false, print: false, projectsLimit: 1, watermark: true, seats: 0, tier: 'trial' };
    const tier = lic.tier || lic.type || 'trial';
    switch (tier) {
      case 'trial':
        return { export: false, print: false, projectsLimit: lic.projectsLimit || 5, watermark: true, seats: 0, tier: 'trial' };
      case 'standard':
        return { export: true, print: true, projectsLimit: lic.projectsLimit || 5, watermark: false, seats: lic.seats || 1, tier: 'standard' };
      case 'pro_monthly':
      case 'pro_yearly':
      case 'pro':
      case 'premium':
        return { export: true, print: true, projectsLimit: Infinity, watermark: false, seats: lic.seats || 2, tier: 'pro' };
      case 'enterprise':
        return { export: true, print: true, projectsLimit: Infinity, watermark: false, seats: lic.seats || 10, tier: 'enterprise' };
      default:
        return { export: false, print: false, projectsLimit: 1, watermark: true, seats: 0, tier: tier };
    }
  }

  /* Validate license locally */
  function validateLicenseLocal(lic) {
    if (!lic) return { valid: false, reason: 'no_license' };
    const now = Date.now();
    if (lic.expiry && now > lic.expiry) return { valid: false, reason: 'expired' };
    if (lic.device && lic.device !== _getDeviceFingerprint()) return { valid: false, reason: 'device_mismatch' };
    return { valid: true, reason: null };
  }

  /* Enforce projects limit and reconcile saved projects and counter
     options: { archiveInsteadOfDelete: boolean } */
  function syncProjectsToLicense(options) {
    const opts = options || {};
    const archiveInsteadOfDelete = !!opts.archiveInsteadOfDelete;
    try {
      const lic = (typeof getLicense === 'function' ? getLicense() : getLicenseLocal()) || JSON.parse(localStorage.getItem('ssp_license') || '{}');
      const limitRaw = lic.projectsLimit || lic.projectLimit || 0;
      const limit = (limitRaw === Infinity || limitRaw === 'Infinity') ? Infinity : Number(limitRaw || 0);

      let list = [];
      try { list = JSON.parse(localStorage.getItem('ssp_projects_list') || '[]'); } catch { list = []; }

      // Unlimited case: ensure count at least equals saved list length
      if (!limit || limit === Infinity) {
        const used = Math.max(Number(localStorage.getItem('ssp_projects_count') || 0), list.length);
        localStorage.setItem('ssp_projects_count', String(used));
        if (typeof updateCreateButtonState === 'function') updateCreateButtonState();
        if (typeof updateProjectsBadge === 'function') updateProjectsBadge();
        return;
      }

      // Trim or archive extras if saved list exceeds limit
      if (Array.isArray(list) && list.length > limit) {
        const kept = list.slice(0, limit);
        const removed = list.slice(limit);

        // Save kept list
        try { localStorage.setItem('ssp_projects_list', JSON.stringify(kept)); } catch (e) { console.error('save kept list failed', e); }

        if (archiveInsteadOfDelete) {
          try {
            const archiveRaw = localStorage.getItem('ssp_projects_archive') || '[]';
            const archive = JSON.parse(archiveRaw);
            const merged = removed.concat(archive);
            localStorage.setItem('ssp_projects_archive', JSON.stringify(merged));
          } catch (e) { console.error('archive save failed', e); }
        } else {
          // Remove actual project entries for removed keys
          removed.forEach(entry => {
            try { if (entry && entry.key) localStorage.removeItem(entry.key); } catch (e) {}
          });
        }
      }

      // Ensure ssp_projects_count does not exceed limit and at least equals saved list length
      const savedList = JSON.parse(localStorage.getItem('ssp_projects_list') || '[]');
      const currentCount = Number(localStorage.getItem('ssp_projects_count') || 0);
      const desired = Math.min(limit, Math.max(currentCount, savedList.length));
      localStorage.setItem('ssp_projects_count', String(desired));

      if (typeof updateCreateButtonState === 'function') updateCreateButtonState();
      if (typeof updateProjectsBadge === 'function') updateProjectsBadge();
    } catch (e) {
      console.error('syncProjectsToLicense failed', e);
    }
  }

  /* Recalculate ssp_projects_count from saved list and license limit (non-destructive) */
  function recalcProjectCountFromList() {
    try {
      const lic = (typeof getLicense === 'function' ? getLicense() : getLicenseLocal()) || {};
      const limitRaw = lic.projectsLimit || lic.projectLimit || 0;
      const limit = (limitRaw === Infinity || limitRaw === 'Infinity') ? Infinity : Number(limitRaw || 0);
      const list = JSON.parse(localStorage.getItem('ssp_projects_list') || '[]');
      const count = list.length;
      const desired = (limit && limit !== Infinity) ? Math.min(limit, count) : count;
      localStorage.setItem('ssp_projects_count', String(desired));
      if (typeof updateCreateButtonState === 'function') updateCreateButtonState();
      if (typeof updateProjectsBadge === 'function') updateProjectsBadge();
      return desired;
    } catch (e) {
      console.error('recalcProjectCountFromList failed', e);
      return Number(localStorage.getItem('ssp_projects_count') || 0);
    }
  }

  /* Ensure license object has the fields we rely on */
  function _ensureLicenseFields(lic) {
    if (!lic) lic = {};
    if (!lic.licenseId) lic.licenseId = 'LIC_' + Date.now();
    if (typeof lic.projectsCreatedTotal !== 'number') lic.projectsCreatedTotal = Number(lic.projectsCreatedTotal || 0);
    return lic;
  }

  /* Override adjustProjectCount to enforce quota semantics (keeps original as fallback) */
  const _origAdjust = (typeof window.adjustProjectCount === 'function') ? window.adjustProjectCount : null;

  function _newAdjustProjectCount(delta) {
    try {
      const lic = _ensureLicenseFields((typeof getLicense === 'function' ? getLicense() : getLicenseLocal()) || {});
      const limitRaw = lic.projectsLimit || lic.projectLimit || 0;
      const limit = (limitRaw === Infinity || limitRaw === 'Infinity') ? Infinity : Number(limitRaw || 0);

      // Positive delta => attempt to create a project (increment creation quota)
      if (delta > 0) {
        const dev = (typeof isDeveloperLoggedIn === 'function' && isDeveloperLoggedIn());
        if (limit && limit !== Infinity && lic.projectsCreatedTotal >= limit && !dev) {
          if (typeof requireUpgrade === 'function') {
            requireUpgrade('Project creation limit reached for your plan.');
          } else {
            alert('Project creation limit reached for your plan. Upgrade to create more.');
          }
          return Number(localStorage.getItem('ssp_projects_count') || 0);
        }

        lic.projectsCreatedTotal = Number(lic.projectsCreatedTotal || 0) + 1;
        saveLicenseLocal(lic);

        const savedList = JSON.parse(localStorage.getItem('ssp_projects_list') || '[]');
        const used = Math.max(Number(localStorage.getItem('ssp_projects_count') || 0), savedList.length);
        const desired = limit && limit !== Infinity ? Math.min(limit, used) : used;
        localStorage.setItem('ssp_projects_count', String(desired));

        if (typeof updateCreateButtonState === 'function') updateCreateButtonState();
        if (typeof updateProjectsBadge === 'function') updateProjectsBadge();
        return Number(localStorage.getItem('ssp_projects_count') || 0);
      }

      // Negative delta => deletion or decrement request (do not decrement projectsCreatedTotal)
      if (delta < 0) {
        const savedList = JSON.parse(localStorage.getItem('ssp_projects_list') || '[]');
        const limitVal = limit && limit !== Infinity ? Math.min(limit, savedList.length) : savedList.length;
        localStorage.setItem('ssp_projects_count', String(limitVal));
        if (typeof updateCreateButtonState === 'function') updateCreateButtonState();
        if (typeof updateProjectsBadge === 'function') updateProjectsBadge();
        return Number(localStorage.getItem('ssp_projects_count') || 0);
      }

      return Number(localStorage.getItem('ssp_projects_count') || 0);
    } catch (e) {
      console.error('adjustProjectCount override failed', e);
      if (_origAdjust) return _origAdjust(delta);
      return Number(localStorage.getItem('ssp_projects_count') || 0);
    }
  }

  window.adjustProjectCount = _newAdjustProjectCount;

  /* createProjectEntry: quota-aware creation helper */
  function createProjectEntry(projectObj) {
    try {
      const lic = _ensureLicenseFields((typeof getLicense === 'function' ? getLicense() : getLicenseLocal()) || {});
      const limitRaw = lic.projectsLimit || lic.projectLimit || 0;
      const limit = (limitRaw === Infinity || limitRaw === 'Infinity') ? Infinity : Number(limitRaw || 0);
      const dev = (typeof isDeveloperLoggedIn === 'function' && isDeveloperLoggedIn());

      if (limit && limit !== Infinity && lic.projectsCreatedTotal >= limit && !dev) {
        if (typeof requireUpgrade === 'function') {
          requireUpgrade('Project creation limit reached for your plan.');
        } else {
          alert('Project creation limit reached for your plan. Upgrade to create more.');
        }
        return null;
      }

      const id = projectObj?.meta?.id || (`P${Date.now()}`);
      const key = 'ssp_project_' + id;
      const project = projectObj || (typeof exportProjectJSON === 'function' ? exportProjectJSON() : { meta: { id }, items: [] });

      try { localStorage.setItem(key, JSON.stringify(project)); } catch (e) { console.error('save project failed', e); }

      const raw = localStorage.getItem('ssp_projects_list') || '[]';
      let list = [];
      try { list = JSON.parse(raw); } catch { list = []; }
      const entry = { id: project.meta?.id || id, name: project.meta?.company || '', savedAt: Date.now(), key };
      list = list.filter(p => p.key !== key && p.id !== entry.id);
      list.unshift(entry);
      const cap = (limit && limit !== Infinity) ? Math.max(limit, 100) : 100;
      list = list.slice(0, cap);
      try { localStorage.setItem('ssp_projects_list', JSON.stringify(list)); } catch (e) { console.error('setSavedList failed', e); }

      lic.projectsCreatedTotal = Number(lic.projectsCreatedTotal || 0) + 1;
      saveLicenseLocal(lic);

      recalcProjectCountFromList();

      if (typeof updateProjectsBadge === 'function') updateProjectsBadge();
      if (typeof updateCreateButtonState === 'function') updateCreateButtonState();
      if (typeof applyLicenseToUI === 'function') {//+++++++++++++++++++++++++++++++++++++++++++++++++++
        try { applyLicenseToUI(); } catch (e) { /* ignore */ }
      }

      return key;
    } catch (e) {
      console.error('createProjectEntry failed', e);
      return null;
    }
  }

  window.createProjectEntry = window.createProjectEntry || createProjectEntry;

  /* deleteSavedProjectSafe: remove saved data and index entry, do not decrement quota */
  function deleteSavedProjectSafe(key) {
    try {
      const rawList = localStorage.getItem('ssp_projects_list') || '[]';
      let list = [];
      try { list = JSON.parse(rawList); } catch { list = []; }
      const idx = list.findIndex(p => p.key === key);
      if (idx === -1) { alert('Saved project not found in index'); return false; }
      try { localStorage.removeItem(key); } catch (e) {}
      list.splice(idx, 1);
      try { localStorage.setItem('ssp_projects_list', JSON.stringify(list)); } catch (e) { console.error('setSavedList failed', e); }

      recalcProjectCountFromList();

      if (typeof updateProjectsBadge === 'function') updateProjectsBadge();
      return true;
    } catch (e) {
      console.error('deleteSavedProjectSafe failed', e);
      return false;
    }
  }

  window.deleteSavedProject = window.deleteSavedProject || deleteSavedProjectSafe;
  window.deleteSavedProjectSafe = deleteSavedProjectSafe;

  /* activateLicenseClientSideSafe: seed fields and reconcile */
  function activateLicenseClientSideSafe(licenseObj) {
    if (!licenseObj) return;
    try {
      const now = Date.now();
      const lic = Object.assign({}, licenseObj);
      lic.activatedAt = lic.activatedAt || now;
      lic.expiry = lic.expiry || licenseObj.expiry || 0;
      lic.device = lic.device || (typeof getDeviceFingerprint === 'function' ? getDeviceFingerprint() : '') || lic.device || '';
      lic.source = lic.source || 'gumroad';
      lic.licenseId = lic.licenseId || ('LIC_' + now);
      lic.projectsCreatedTotal = Number(lic.projectsCreatedTotal || 0);
      if (!lic.projectsLimit && lic.tier) {
        lic.projectsLimit = (lic.tier === 'trial' ? 5 : (lic.tier === 'standard' ? 5 : (lic.tier.startsWith('pro') || lic.tier === 'enterprise' ? Infinity : 5)));
      }

      saveLicenseLocal(lic);

      try { syncProjectsToLicense(); } catch (e) { /* non-fatal */ }
      try { recalcProjectCountFromList(); } catch (e) { /* non-fatal */ }

      if (typeof applyLicenseToUI === 'function') {
        try { applyLicenseToUI(); } catch (e) { /* ignore */ }
      }
      if (typeof updateLicenseStatus === 'function') {
        try { updateLicenseStatus(); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.error('activateLicenseClientSideSafe failed', e);
    }
  }

  window.activateLicenseClientSide = window.activateLicenseClientSide || activateLicenseClientSideSafe;

/* Wrap applyLicenseToUI to ensure reconciliation runs first */
if (typeof applyLicenseToUI === 'function') {
  const _origApply = applyLicenseToUI;
  window.applyLicenseToUI = function wrappedApplyLicenseToUI() {
    try {
      // Reconcile license/project state first
      try { syncProjectsToLicense(); } catch (e) { /* non-fatal */ }
      try { recalcProjectCountFromList(); } catch (e) { /* non-fatal */ }

      // Call original applyLicenseToUI
      return _origApply();
    } catch (e) {
      console.error('applyLicenseToUI wrapped call failed', e);
      // continue to finalization
    } finally {
      // Finalize: enforce compact badge visibility for Standard tier only
      try {
        const badge = document.getElementById('projectsBadge');
        const lic2 = (typeof getLicense === 'function') ? getLicense() : JSON.parse(localStorage.getItem('ssp_license')||'{}');
        const tier2 = (lic2 && (lic2.tier || lic2.type)) ? (lic2.tier || lic2.type) : 'trial';
        const showForStandard2 = (String(tier2).toLowerCase() === 'standard') || (typeof isDeveloperLoggedIn === 'function' && isDeveloperLoggedIn());
        if (badge) badge.style.display = showForStandard2 ? (badge.style.display || 'inline-block') : 'none';
      } catch (e) { /* non-fatal */ }
    }
  };
}
 else {
    window.applyLicenseToUI = window.applyLicenseToUI || function () {
      try { syncProjectsToLicense(); } catch (e) {}
      try { recalcProjectCountFromList(); } catch (e) {}
      if (typeof updateLicenseStatus === 'function') try { updateLicenseStatus(); } catch (e) {}
      if (typeof enforceTrialRestrictions === 'function') try { enforceTrialRestrictions(); } catch (e) {}
      if (typeof updateProjectsBadge === 'function') try { updateProjectsBadge(); } catch (e) {}
    };
  }

  window.syncProjectsToLicense = window.syncProjectsToLicense || syncProjectsToLicense;
  window.recalcProjectCountFromList = window.recalcProjectCountFromList || recalcProjectCountFromList;

  document.addEventListener('DOMContentLoaded', function () {
    try {
      const lic = _ensureLicenseFields((typeof getLicense === 'function' ? getLicense() : getLicenseLocal()) || {});
      saveLicenseLocal(lic);
    } catch (e) { /* ignore */ }

    try { syncProjectsToLicense(); } catch (e) { /* ignore */ }
    try { recalcProjectCountFromList(); } catch (e) { /* ignore */ }
    try { if (typeof updateProjectsBadge === 'function') updateProjectsBadge(); } catch (e) {}
    try { if (typeof updateCreateButtonState === 'function') updateCreateButtonState(); } catch (e) {}
  });

})();
