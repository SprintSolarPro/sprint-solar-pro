// init.js â€” wire UI without inline handlers (cleaned)
(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }

  function safeAddListener(el, event, fn) {
    if (!el || typeof fn !== 'function') return;
    el.addEventListener(event, fn);
  }

  function wireNav() {
    const map = [
      ['navHomeBtn', 'home'],
      ['navSystemBtn', 'system'],
      ['navLoadBtn', 'load'],
      ['navSizingBtn', 'sizing'],
      ['navQuoteBtn', 'quote'],
      ['navLicenseBtn', 'license']
    ];
    map.forEach(([btnId, page]) => {
      const btn = byId(btnId);
      safeAddListener(btn, 'click', () => { if (typeof window.showPage === 'function') window.showPage(page); });
    });
  }

  function wireFileMenu() {
    const map = [
      ['fileNewBtn', 'fileNew'],
      ['fileOpenBtn', 'fileOpen'],
      ['fileSaveBtn', 'fileSave'],
      ['fileSaveAsBtn', 'fileSaveAs'],
      ['filePrintMenuBtn', 'printQuote'],
      ['fileShareMenuBtn', 'shareQuote'],
      ['fileExitBtn', 'exitApp']
    ];
    map.forEach(([elId, fnName]) => {
      const el = byId(elId);
      safeAddListener(el, 'click', () => {
        const fn = window[fnName];
        if (typeof fn === 'function') fn();
        else alert(`${fnName} not available`);
      });
    });
  }

  function wireButtons() {
    const el = byId;
    safeAddListener(el('devLoginBtn'), 'click', () => { if (typeof openDevModal === 'function') openDevModal(); });
    safeAddListener(el('switchToTrialBtn'), 'click', () => { if (typeof switchToTrial === 'function') switchToTrial(); });
    safeAddListener(el('upgradeBtn'), 'click', () => { if (typeof openActivationModal === 'function') openActivationModal(); else if (typeof showPage === 'function') showPage('license'); });
    safeAddListener(el('activateLicenseBtn'), 'click', () => { if (typeof activateLicense === 'function') activateLicense(); });
    safeAddListener(el('addApplianceBtn'), 'click', () => { if (typeof addRow === 'function') addRow(); });
    safeAddListener(el('calcSizingBtn'), 'click', () => { if (typeof calculateSizing === 'function') { calculateSizing(); if (typeof showPage === 'function') showPage('sizing'); } });
    safeAddListener(el('toQuoteBtn'), 'click', () => { if (typeof populateQuoteFromSizing === 'function') populateQuoteFromSizing(); if (typeof showPage === 'function') showPage('quote'); });
    safeAddListener(el('addQuoteItemBtn'), 'click', () => { if (typeof addQuoteRow === 'function') addQuoteRow(); });
    safeAddListener(el('exportPdfBtn'), 'click', () => { if (typeof exportQuotePDF === 'function') exportQuotePDF(); });
    safeAddListener(el('printBtn'), 'click', () => { if (typeof printQuote === 'function') printQuote(); });
    safeAddListener(el('setDevCredBtn'), 'click', () => { if (typeof setDeveloperCredential === 'function') setDeveloperCredential(); });
    safeAddListener(el('devLoginBtn'), 'click', () => { if (typeof developerLogin === 'function') developerLogin(); });
    safeAddListener(el('closeDevModalBtn'), 'click', () => { if (typeof closeDevModal === 'function') closeDevModal(); });
    // optional activation submit (if present in some UIs)
    const activationSubmit = el('activationSubmitBtn');
    if (activationSubmit) safeAddListener(activationSubmit, 'click', () => { if (typeof submitActivation === 'function') submitActivation(); });
  }

  function wireInputs() {
    const currency = byId('currencySelector');
    if (currency) currency.addEventListener('input', () => { if (typeof updateCurrencySymbol === 'function') updateCurrencySymbol(); });

    const companyName = byId('companyName');
    if (companyName) companyName.addEventListener('input', () => { if (typeof updateBranding === 'function') updateBranding(); });

    const companyLogoUrl = byId('companyLogoUrl');
    if (companyLogoUrl) companyLogoUrl.addEventListener('input', () => { if (typeof updateBranding === 'function') updateBranding(); });
  }

  function restoreProjectsBadge() {
    try {
      const badge = byId('projectsBadge');
      const countEl = byId('projectsCount');
      const used = Number(localStorage.getItem('ssp_projects_count') || 0);
      if (countEl) countEl.innerText = String(used);
      if (badge) badge.style.display = used > 0 ? 'inline-block' : 'none';
      if (typeof updateProjectsBadge === 'function') updateProjectsBadge();
      if (typeof updateCreateButtonState === 'function') updateCreateButtonState();
    } catch (e) { console.error('restoreProjectsBadge error', e); }
  }

  window.addEventListener('DOMContentLoaded', () => {
    wireNav();
    wireFileMenu();
    wireButtons();
    wireInputs();
    restoreProjectsBadge();

    if (typeof initLicenseState === 'function') initLicenseState();
    if (typeof updateCurrencySymbol === 'function') updateCurrencySymbol();
    if (typeof updateBranding === 'function') updateBranding();
    if (typeof attachListeners === 'function') attachListeners();
  });

})();
