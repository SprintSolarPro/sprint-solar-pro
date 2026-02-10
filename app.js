// app.js
// Sprint Solar Pro — renderer script with integrated license manager.
// All stray metadata removed. Keep this file together with index.html and license.js.

// ---------- Image helpers ----------
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    } catch (e) {
      reject(e);
    }
  });
}

async function fetchImageAsDataUrl(url) {
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new Error('fetch failed ' + resp.status);
    const blob = await resp.blob();
    return await blobToDataURL(blob);
  } catch (e) {
    console.warn('fetchImageAsDataUrl failed for', url, e);
    return null;
  }
}

// ---------- small helpers ----------
const $ = id => document.getElementById(id);
const nf = (v) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(v) || 0);
const showToast = (m) => { try { console.info(m); } catch (e) {} };

function setTextIfExists(id, value) { try { const el = document.getElementById(id); if (el) el.textContent = value; } catch (e) {} }
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function updateLicenseRibbonUI() {
  try {
    const lic = loadLicense();
    const badge = $('licenseTypeBadge');
    const projectsEl = $('licenseProjects');
    const rebindEl = $('licenseRebinds');
    const bar = $('licenseProgressBar');
    if (!badge || !projectsEl || !rebindEl || !bar) return;

    if (!lic) {
      badge.textContent = 'No license';
      badge.style.background = '#6c757d';
      projectsEl.textContent = 'Projects: 0';
      rebindEl.textContent = 'Rebinds: 0';
      bar.style.width = '0%';
      bar.style.background = '#ffd700';
      return;
    }

    badge.textContent = lic.type || 'LICENSE';
    badge.style.background = (lic.type === 'DEVELOPER') ? '#28a745' : '#0b5fff';

    const used = Number(lic.projectsUsed || 0);
    let limit = Infinity;
    if (lic.type === 'PRO_STANDARD') limit = LICENSE_TYPES.PRO_STANDARD.expiryProjects || 5;
    if (lic.type === 'TRIAL') limit = LICENSE_TYPES.TRIAL.projectsLimit || 2;

    projectsEl.textContent = isFinite(limit) ? `Projects: ${used}/${limit}` : `Projects: ${used}`;
    rebindEl.textContent = `Rebinds: ${lic.rebindCount || 0}`;

    if (isFinite(limit) && limit > 0) {
      const pct = Math.min(100, Math.round((used / limit) * 100));
      bar.style.width = pct + '%';
      bar.style.background = pct >= 90 ? '#e74c3c' : (pct >= 70 ? '#f39c12' : '#2ecc71');
    } else {
      bar.style.width = '100%';
      bar.style.background = '#2ecc71';
    }
  } catch (e) { console.warn('updateLicenseRibbonUI failed', e); }
}

// ---------- Read / Save system inputs ----------
function readSystemInputs() {
  const typedBattery = $('batteryType')?.value?.trim();
  const selectedBattery = $('batteryTypeSelect')?.value || '';
  const batteryType = typedBattery || selectedBattery || '';
  return {
    inverterType: $('inverterType')?.value || '',
    inverterRatedPower: Number($('inverterRatedPower')?.value || 0),
    inverterOutputType: $('inverterOutputType')?.value || 'AC',
    inverterDcBusVoltage: Number($('inverterDcBusVoltage')?.value || $('inverterVoltage')?.value || 48),
    inverterVoltage: Number($('inverterVoltage')?.value || 230),
    inverterEfficiency: Number($('inverterEfficiency')?.value || 0),
    batteryType,
    batteryCapacityAh: Number($('batteryCapacity')?.value || 0),
    batteryVoltage: Number($('batteryVoltage')?.value || 48),
    batteryDoD: Number($('batteryDoD')?.value || 80),
    panelWatt: Number($('panelWatt')?.value || 0),
    panelVoltage: Number($('panelVoltage')?.value || 40),
    sunHours: Number($('sunHours')?.value || 0),
    deratingFactor: Number($('deratingFactor')?.value || 100),
    autonomyDays: Number($('autonomyDays')?.value || 0),
    companyName: $('companyName')?.value || '',
    companySlogan: $('companySlogan')?.value || '',
    companyAddress: $('companyAddress')?.value || '',
    companyLogoUrl: $('companyLogoUrl')?.value || '',
    currencySelector: $('currencySelector')?.value || ''
  };
}

function saveSystemInputsToState() {
  try {
    const sys = readSystemInputs();
    window.__systemSaved = sys;
    const qc = $('quoteCurrency');
    if (qc) {
      const sel = sys.currencySelector || '';
      qc.value = (sel && /[^A-Za-z0-9]/.test(sel)) ? sel : sel.toUpperCase() || qc.value;
    }
    return sys;
  } catch (e) { return null; }
}

// ---------- Load table helpers ----------
function createLoadRow(item = { name: '', qty: 1, power: 0, hours: 0 }) {
  const tbody = $('loadTableBody'); if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="appliance-name" type="text" value="${escapeHtml(item.name)}" /></td>
    <td><input class="appliance-qty" type="number" min="0" value="${item.qty}" /></td>
    <td><input class="appliance-power" type="number" min="0" value="${item.power}" /></td>
    <td><input class="appliance-hours" type="number" min="0" step="0.1" value="${item.hours}" /></td>
    <td class="appliance-energy">${nf(item.qty * item.power * item.hours)}</td>
    <td class="action-cell"><button type="button" class="remove-load btn-ghost">Remove</button></td>
  `;
  tbody.appendChild(tr);
  ['appliance-qty','appliance-power','appliance-hours'].forEach(cls => {
    const el = tr.querySelector('.' + cls); if (el) el.addEventListener('input', recalcLoadTotals);
  });
  tr.querySelector('.remove-load')?.addEventListener('click', () => { tr.remove(); recalcLoadTotals(); });
  recalcLoadTotals();
}

function recalcLoadTotals() {
  const rows = Array.from(document.querySelectorAll('#loadTableBody tr'));
  let total = 0, peak = 0;
  rows.forEach(r => {
    const qty = Number(r.querySelector('.appliance-qty')?.value || 0);
    const power = Number(r.querySelector('.appliance-power')?.value || 0);
    const hours = Number(r.querySelector('.appliance-hours')?.value || 0);
    const energy = qty * power * hours;
    const energyCell = r.querySelector('.appliance-energy'); if (energyCell) energyCell.textContent = nf(energy);
    total += energy; peak = Math.max(peak, qty * power);
  });
  setTextIfExists('totalEnergy', nf(total));
  window.__lastLoad = { totalDailyEnergyWh: total, peakLoadW: peak };
  return window.__lastLoad;
}

// ---------- Sizing ----------
function calculateSizing() {
  try {
    const load = window.__lastLoad || recalcLoadTotals();
    const sys = window.__systemSaved || readSystemInputs();
    const dailyEnergy = load.totalDailyEnergyWh || 0;
    const peakLoad = load.peakLoadW || 0;
    const inverterRatedW = (sys.inverterRatedPower || 0) * 1000;
    const inverterQty = inverterRatedW > 0 ? Math.max(1, Math.ceil(peakLoad / inverterRatedW)) : 0;
    const autonomyDays = sys.autonomyDays || 0;
    const totalEnergyForAutonomy = dailyEnergy * (autonomyDays || 1);
    const dod = (sys.batteryDoD || 80) / 100;
    const batteryVoltage = sys.batteryVoltage || 48;
    const requiredAh = batteryVoltage > 0 && dod > 0 ? (totalEnergyForAutonomy / batteryVoltage) / dod : 0;
    const batteryCapacityAh = sys.batteryCapacityAh || 0;
    const batteryQty = batteryCapacityAh > 0 ? Math.max(0, Math.ceil(requiredAh / batteryCapacityAh)) : 0;
    const derating = (sys.deratingFactor || 100) / 100;
    const sunHours = sys.sunHours || 0;
    const panelWatt = sys.panelWatt || 0;
    const requiredArrayW = sunHours > 0 && derating > 0 ? dailyEnergy / (sunHours * derating) : 0;
    const panelQty = panelWatt > 0 ? Math.max(0, Math.ceil(requiredArrayW / panelWatt)) : 0;
    const inverterDcBus = Number(sys.inverterDcBusVoltage || sys.inverterVoltage || 48);
    const batterySeriesCount = batteryVoltage > 0 ? Math.max(1, Math.ceil(inverterDcBus / batteryVoltage)) : 1;
    const batteryParallelCount = batterySeriesCount > 0 ? Math.max(0, Math.ceil(batteryQty / batterySeriesCount)) : 0;
    const panelVoc = sys.panelVoltage || 40;
    const panelSeriesCount = panelVoc > 0 ? Math.max(1, Math.round(inverterDcBus / panelVoc)) : 1;
    const panelParallelStrings = panelSeriesCount > 0 ? Math.max(0, Math.ceil(panelQty / panelSeriesCount)) : 0;

    const result = {
      dailyEnergy, peakLoad, inverterQty, batteryQty,
      requiredAh: Number(requiredAh.toFixed(2)),
      batterySeriesCount, batteryParallelCount,
      panelQty, panelSeriesCount, panelParallelStrings,
      autonomyDays, inverterDcBus
    };
    window.__lastSizing = result;

    setTextIfExists('dailyEnergyDisplay', nf(dailyEnergy));
    setTextIfExists('peakLoadDisplay', nf(peakLoad));
    setTextIfExists('inverterQtyResult', inverterQty);
    setTextIfExists('autonomyDisplay', autonomyDays);
    setTextIfExists('batteryQty', batteryQty);
    setTextIfExists('batterySeriesCount', batterySeriesCount);
    setTextIfExists('batteryParallelCount', batteryParallelCount);
    setTextIfExists('batteryAhRequired', Number(requiredAh).toFixed(2));
    setTextIfExists('panelQty', panelQty);
    setTextIfExists('panelSeriesCount', panelSeriesCount);
    setTextIfExists('panelParallelStrings', panelParallelStrings);

    return result;
  } catch (err) { console.error('calculateSizing failed', err); return null; }
}

// ---------- Quote helpers ----------
function createQuoteRow(item = { name: '', qty: 1, price: 0 }) {
  const tbody = $('quoteTableBody'); if (!tbody) return;
  const tr = document.createElement('tr');

  const priceRaw = Number(item.price || 0);
  tr.innerHTML = `
    <td><input class="quote-item-name" type="text" value="${escapeHtml(item.name)}" /></td>
    <td><input class="quote-item-qty" type="number" min="0" value="${item.qty}" /></td>
    <td class="numeric"><input class="quote-item-price" type="text" inputmode="numeric" value="${priceRaw}" data-raw="${priceRaw}" style="text-align:right" /></td>
    <td class="quote-item-total numeric">${nf(item.qty * priceRaw)}</td>
    <td class="action-cell"><button type="button" class="remove-quote btn-ghost">Remove</button></td>
  `;
  tbody.appendChild(tr);

  const qtyEl = tr.querySelector('.quote-item-qty');
  const priceEl = tr.querySelector('.quote-item-price');
  const nameEl = tr.querySelector('.quote-item-name');

  const updateTotals = () => calculateQuoteTotals();

  if (qtyEl) qtyEl.addEventListener('input', updateTotals);
  if (nameEl) nameEl.addEventListener('input', updateTotals);

  if (priceEl) {
    priceEl.addEventListener('focus', () => {
      const raw = priceEl.getAttribute('data-raw') || priceEl.value || '0';
      priceEl.value = String(raw).replace(/,/g, '');
    });
    priceEl.addEventListener('blur', () => {
      const parsed = parseFloat(String(priceEl.value).replace(/,/g, '')) || 0;
      priceEl.setAttribute('data-raw', parsed);
      priceEl.value = nf(parsed);
      calculateQuoteTotals();
    });
    priceEl.value = nf(priceRaw);
    priceEl.setAttribute('data-raw', priceRaw);
  }

  tr.querySelector('.remove-quote')?.addEventListener('click', () => { tr.remove(); calculateQuoteTotals(); });
  calculateQuoteTotals();
}

function calculateQuoteTotals() {
  const rows = Array.from(document.querySelectorAll('#quoteTableBody tr'));
  let subtotal = 0;
  rows.forEach(r => {
    const qty = Number(r.querySelector('.quote-item-qty')?.value || 0);
    const priceEl = r.querySelector('.quote-item-price');
    const price = Number(priceEl?.getAttribute('data-raw') || 0);
    const total = qty * price;
    const totalCell = r.querySelector('.quote-item-total');
    if (totalCell) totalCell.textContent = nf(total);
    subtotal += total;
  });
  setTextIfExists('quoteSubtotal', nf(subtotal));
  const taxPct = Number($('quoteTax')?.value || 0);
  const total = subtotal * (1 + taxPct / 100);
  setTextIfExists('quoteTotal', nf(total));

  const currencySymbol = ($('quoteCurrency')?.value || $('currencySelector')?.value || '₦');
  const currencyName = currencyNameFromCode(currencySymbol);
  const amountWords = numberToWordsFull(Math.round(total), currencyName);
  if ($('amountWords')) $('amountWords').value = amountWords;

  return { subtotal, total };
}

function generateQuoteMeta() {
  const now = new Date();
  const id = `Quotation_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  return { id, date: now.toLocaleString() };
}

function currencyNameFromCode(code) {
  const c = (code || '').toUpperCase();
  if (c.includes('NGN') || c === '₦') return 'Naira';
  if (c.includes('USD') || c === '$') return 'Dollar';
  if (c.includes('EUR') || c === '€') return 'Euro';
  if (c.includes('GBP') || c === '£') return 'Pound';
  if (c.includes('JPY') || c === '¥') return 'Yen';
  if (c.includes('INR') || c === '₹') return 'Rupee';
  return c || 'Currency';
}

function numberToWordsFull(n, currencyName = 'Naira') {
  n = Number(n) || 0;
  if (n === 0) return `Zero ${currencyName} Only`;
  const a = ['', 'one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const b = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  function chunk(num){
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num/10)] + (num%10 ? ' ' + a[num%10] : '');
    if (num < 1000) return a[Math.floor(num/100)] + ' hundred' + (num%100 ? ' and ' + chunk(num%100) : '');
    return '';
  }
  const units = [['million',1000000], ['thousand',1000], ['','1']];
  let words = '';
  let remaining = n;
  units.forEach(([name, val]) => {
    if (val === 1) {
      if (remaining > 0) { words += chunk(remaining) + ' '; remaining = 0; }
    } else {
      const part = Math.floor(remaining / val);
      if (part > 0) { words += chunk(part) + (name ? ' ' + name : '') + ' '; remaining = remaining % val; }
    }
  });
  words = words.trim();
  const titled = words.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return `${titled} ${currencyName} Only`;
}
/* ---------- Build header (company name prominent; slogan centered) ---------- */
async function buildQuoteHeader(sys, meta) {
  const container = document.createElement('div');
  container.className = 'quote-header';

  const brandRow = document.createElement('div');
  brandRow.className = 'brand-row';

  const logoCandidate = (sys && sys.companyLogoUrl ? String(sys.companyLogoUrl).trim() : '') || '';
  if (logoCandidate) {
    const img = document.createElement('img');
    img.className = 'company-logo';
    img.alt = sys && sys.companyName ? sys.companyName : 'Logo';
    try {
      if (/^data:/i.test(logoCandidate)) {
        img.src = logoCandidate;
      } else if (/^https?:\/\//i.test(logoCandidate)) {
        img.src = logoCandidate;
        img.setAttribute('crossorigin', 'anonymous');
      } else {
        if (window.electronAPI && typeof window.electronAPI.readLocalFileAsDataUrl === 'function') {
          const localPath = String(logoCandidate).replace(/^file:\/\//i, '');
          try {
            const dataUrl = await window.electronAPI.readLocalFileAsDataUrl(localPath);
            if (dataUrl) img.src = dataUrl;
          } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }
    if (img.src) brandRow.appendChild(img);
  }

  const nameEl = document.createElement('div');
  nameEl.className = 'company-name';
  nameEl.textContent = (sys && sys.companyName ? String(sys.companyName).toUpperCase() : 'YOUR COMPANY NAME');
  nameEl.id = 'brandName';
  brandRow.appendChild(nameEl);

  container.appendChild(brandRow);

  if (sys && sys.companySlogan) {
    const slogan = document.createElement('div');
    slogan.className = 'company-slogan';
    slogan.textContent = sys.companySlogan;
    container.appendChild(slogan);
  }

  if (sys && sys.companyAddress) {
    const addr = document.createElement('div');
    addr.className = 'company-address';
    addr.textContent = sys.companyAddress;
    container.appendChild(addr);
  }

  const title = document.createElement('div');
  title.className = 'quote-title';
  title.textContent = 'Quotation';
  container.appendChild(title);

  const metaDiv = document.createElement('div');
  metaDiv.className = 'quote-meta';
  metaDiv.textContent = `Date: ${meta.date} | ID: ${meta.id}`;
  container.appendChild(metaDiv);

  return container;
}

/* ---------- Ensure html2pdf available ---------- */
async function ensureHtml2PdfAvailable() {
  if (typeof html2pdf === 'function') return true;
  if (window.__html2pdfLoaded) {
    for (let i = 0; i < 20; i++) {
      if (typeof html2pdf === 'function') return true;
      await new Promise(r => setTimeout(r, 100));
    }
  }
  try {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = './libs/html2pdf.bundle.min.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('local html2pdf load failed'));
      document.head.appendChild(s);
    });
    return typeof html2pdf === 'function';
  } catch (e) {
    console.warn('ensureHtml2PdfAvailable failed', e);
    return false;
  }
}

/* ---------- Export to PDF (robust sanitization) ---------- */
async function exportQuoteToPdf() {
  try {
    const quoteSection = document.getElementById('quote');
    if (!quoteSection) { showToast('Quote not available'); return; }

    const clone = quoteSection.cloneNode(true);
    hideActionColumnForPdf(clone);
    clone.querySelectorAll('.quote-print-exclude').forEach(n => n.remove());

    function hideActionColumnForPdf(root) {
      if (!root) return;
      const table = root.querySelector('.quote-table');
      if (!table) return;
      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');
      const tfoot = table.querySelector('tfoot');
      if (!thead) return;
      const headerCells = Array.from(thead.querySelectorAll('th'));
      const actionIndex = headerCells.findIndex(
        th => th.textContent.trim().toLowerCase() === 'action'
      );
      if (actionIndex === -1) return;
      headerCells[actionIndex].remove();
      if (tbody) {
        tbody.querySelectorAll('tr').forEach(row => {
          if (row.children[actionIndex]) {
            row.children[actionIndex].remove();
          }
        });
      }
      if (tfoot) {
        tfoot.querySelectorAll('tr').forEach(row => {
          if (row.children[actionIndex]) {
            row.children[actionIndex].remove();
          }
          const firstCell = row.children[0];
          if (firstCell && firstCell.hasAttribute('colspan')) {
            const span = parseInt(firstCell.getAttribute('colspan'), 10);
            if (!isNaN(span) && span > 1) {
              firstCell.setAttribute('colspan', span - 1);
            }
          }
        });
      }
      const colgroup = table.querySelector('colgroup');
      if (colgroup && colgroup.children[actionIndex]) {
        colgroup.children[actionIndex].remove();
      }
    }

    clone.querySelectorAll('script, style, #edgeTabsData').forEach(n => n.remove());

    clone.querySelectorAll('input, textarea, button').forEach(el => {
      const span = document.createElement('div');
      const raw = (el.getAttribute && el.getAttribute('data-raw')) ?? null;
      span.textContent = (raw !== null ? raw : (el.value || el.textContent || ''));
      span.style.margin = '4px 0';
      span.style.whiteSpace = 'pre-wrap';
      el.parentNode && el.parentNode.replaceChild(span, el);
    });

    Array.from(clone.querySelectorAll('*')).forEach(el => {
      if (el.textContent && /edge_all_open_tabs|WebsiteContent_/i.test(el.textContent)) {
        el.textContent = el.textContent.replace(/edge_all_open_tabs[\s\S]*/i, '');
      }
    });

    try { if (window.edge_all_open_tabs) delete window.edge_all_open_tabs; } catch (e) { /* ignore */ }

    const meta = window.__lastQuoteMeta || { id: `QUO-${Date.now()}`, date: new Date().toLocaleString() };
    const footer = document.createElement('div');
    footer.style.fontSize = '10px';
    footer.style.color = '#777';
    footer.style.marginTop = '18px';
    footer.style.textAlign = 'center';
    footer.textContent = `Quote ID: ${meta.id} | Generated: ${meta.date}`;
    clone.appendChild(footer);

    const wrapper = document.createElement('div');
    wrapper.id = 'pdfExportWrapper';
    wrapper.style.padding = '18px';
    wrapper.style.fontFamily = 'Arial, Helvetica, sans-serif';
    wrapper.style.width = '794px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.appendChild(clone);

    document.body.appendChild(wrapper);

    await new Promise(resolve => {
      const imgs2 = Array.from(wrapper.querySelectorAll('img'));
      if (!imgs2.length) return resolve();
      let done = 0;
      const finish = () => { done++; if (done === imgs2.length) resolve(); };
      imgs2.forEach(img => {
        if (img.complete && img.naturalWidth !== 0) finish();
        else { img.addEventListener('load', finish, { once: true }); img.addEventListener('error', finish, { once: true }); }
      });
      setTimeout(resolve, 4000);
    });

    const opt = {
      margin: 10,
      filename: `quote-${meta.id}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: false },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
    };

    const html2pdfReady = await ensureHtml2PdfAvailable();
    if (!html2pdfReady) {
      showToast('PDF export unavailable: html2pdf library could not be loaded. Try packaging the app (Electron) or include ./libs/html2pdf.bundle.min.js.');
      wrapper.remove();
      return;
    }

    try {
      await html2pdf().set(opt).from(wrapper).save();
      showToast('PDF downloaded (client).');
      // mark project completed for license (first successful PDF export counts)
      markProjectCompletedForLicense();
    } catch (err) {
      console.error('html2pdf failed', err);
      try { window.print(); } catch (e) { console.warn('print fallback failed', e); }
    } finally {
      wrapper.remove();
    }
  } catch (err) {
    console.error('Export to PDF failed', err);
    showToast('Export to PDF failed');
  }
}

/* ---------- Utilities & wiring ---------- */
function printQuote() { try { window.print(); markProjectCompletedForLicense(); } catch (e) { console.warn('printQuote failed', e); showToast('Print failed'); } }
function estimateInverterPrice(kW){ return Math.round((kW || 5) * 40000); }
function estimateBatteryUnitPrice(type){ return 80000; }
function estimatePanelPrice(watt){ return Math.round((watt || 550) * 30); }

function newProject(){ if (!confirm('Start a new project? Unsaved changes will be lost.')) return; if ($('quoteTableBody')) $('quoteTableBody').innerHTML=''; if ($('loadTableBody')) $('loadTableBody').innerHTML=''; showToast('New project started'); }
function openProject(){ const input = document.createElement('input'); input.type='file'; input.accept='.json'; input.addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; const txt = await f.text(); try{ const parsed = JSON.parse(txt); if (parsed.load && Array.isArray(parsed.load.items)){ if ($('loadTableBody')) $('loadTableBody').innerHTML=''; parsed.load.items.forEach(it=>createLoadRow(it)); } if (parsed.quote && Array.isArray(parsed.quote.items)){ if ($('quoteTableBody')) $('quoteTableBody').innerHTML=''; parsed.quote.items.forEach(it=>createQuoteRow(it)); } showToast('Project loaded'); } catch(err){ alert('Invalid project file'); } }, {once:true}); input.click(); }
function saveProject(){ const state = collectState(); const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'project.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),3000); showToast('Project saved'); }
function saveProjectAs(){ saveProject(); }
function printPage(){ window.print(); }
function shareProject(){ showToast('Share not implemented'); }
function exitApp(){ if (confirm('Exit application?')) try{ window.close(); } catch(e){ showToast('Close not supported'); } }

window.newProject = newProject; window.openProject = openProject; window.saveProject = saveProject; window.saveProjectAs = saveProjectAs;
window.printPage = printPage; window.shareProject = shareProject; window.exitApp = exitApp;

function collectState(){
  const quoteItems = Array.from(document.querySelectorAll('#quoteTableBody tr')).map(tr => ({
    name: tr.querySelector('.quote-item-name')?.value || '',
    qty: Number(tr.querySelector('.quote-item-qty')?.value || 0),
    price: Number(tr.querySelector('.quote-item-price')?.getAttribute('data-raw') || 0)
  }));
  const loadItems = Array.from(document.querySelectorAll('#loadTableBody tr')).map(tr => ({
    name: tr.querySelector('.appliance-name')?.value || '',
    qty: Number(tr.querySelector('.appliance-qty')?.value || 0),
    power: Number(tr.querySelector('.appliance-power')?.value || 0),
    hours: Number(tr.querySelector('.appliance-hours')?.value || 0)
  }));
  return { system: window.__systemSaved || readSystemInputs(), quote: { items: quoteItems }, load: { items: loadItems }, meta: { savedAt: new Date().toISOString() } };
}

function showPage(pageId){
  try {
    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
    const target = document.getElementById(pageId);
    if (target) { target.classList.add('active'); target.style.display = 'block'; try { history.replaceState(null,'','#'+pageId); } catch(e){} }
  } catch(e){ console.warn('showPage failed', e); }
}
window.showPage = showPage;

function attachTooltip(targetId, tooltipText) {
  const target = $(targetId); if (!target) return;
  if (document.getElementById(targetId + '-tooltip')) return;
  const wrapper = document.createElement('div'); wrapper.style.display = 'flex'; wrapper.style.alignItems = 'center'; wrapper.style.gap = '8px';
  const parent = target.parentNode; if (!parent) return;
  parent.replaceChild(wrapper, target); wrapper.appendChild(target);
  const info = document.createElement('span'); info.id = targetId + '-tooltip'; info.textContent = 'i'; info.title = tooltipText;
  info.style.cursor = 'help'; info.style.color = '#0b5fff'; info.style.fontWeight = '700'; info.style.padding = '2px 6px'; info.style.borderRadius = '50%';
  info.style.border = '1px solid rgba(11,95,255,0.15)'; info.style.background = 'rgba(11,95,255,0.06)'; wrapper.appendChild(info);
}

/* ---------- License Manager (integrated) ---------- */
const LICENSE_TYPES = {
  DEVELOPER: { id: 'DEVELOPER', privileges: 'all', expiryDays: null, projectsLimit: Infinity },
  TRIAL: { id: 'TRIAL', privileges: 'limited', expiryDays: 7, projectsLimit: 2 },
  PRO_STANDARD: { id: 'PRO_STANDARD', privileges: 'full', expiryProjects: 5 },
  PRO_MONTHLY: { id: 'PRO_MONTHLY', privileges: 'full', expiryDays: 30 },
  PRO_YEARLY: { id: 'PRO_YEARLY', privileges: 'full', expiryDays: 365 },
  ENTERPRISE_YEARLY: { id: 'ENTERPRISE_YEARLY', privileges: 'full', expiryDays: 365, maxUsers: 10 }
};

const STORAGE_KEYS = {
  LICENSE: 'sprint_license_v1',
  APP_ID: 'sprint_app_install_id',
  PROJECTS_LOG: 'sprint_projects_log_v1'
};

function generateAppInstallId() {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.APP_ID);
    if (!id) {
      id = 'app-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEYS.APP_ID, id);
    }
    return id;
  } catch (e) { return 'app-unknown'; }
}

function deviceFingerprintParts() {
  const ua = navigator.userAgent || '';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const res = (screen.width || 0) + 'x' + (screen.height || 0);
  const appId = generateAppInstallId();
  return { ua, tz, res, appId };
}

function generateDeviceHash(email = '', phone = '') {
  const p = deviceFingerprintParts();
  const raw = `${p.ua}|${p.res}|${p.tz}|${p.appId}|${email}|${phone}`;
  return simpleHash(raw);
}

function simpleHash(s) {
  // lightweight hash for local tamper detection (not cryptographically secure)
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function loadLicense() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LICENSE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!verifyLicenseChecksum(parsed)) {
      console.warn('License checksum failed — possible tamper');
      // downgrade to trial-like state
      return null;
    }
    return parsed;
  } catch (e) { return null; }
}

function saveLicense(lic) {
  try {
    lic.checksum = licenseChecksum(lic);
    localStorage.setItem(STORAGE_KEYS.LICENSE, JSON.stringify(lic));
    try { updateLicenseRibbonUI(); } catch(e) {}
  } catch (e) { console.warn('saveLicense failed', e); }
}

function licenseChecksum(lic) {
  const core = `${lic.licenseKey}|${lic.type}|${lic.issuedAt}|${lic.projectsUsed}|${lic.deviceHash}|${lic.rebindCount || 0}`;
  return simpleHash(core);
}

function verifyLicenseChecksum(lic) {
  try {
    if (!lic || !lic.checksum) return false;
    return lic.checksum === licenseChecksum(lic);
  } catch (e) { return false; }
}

function activateLicense() {
  const key = $('licenseKey')?.value.trim();
  const email = $('licenseEmail')?.value.trim();
  const phone = $('licensePhone')?.value.trim();
  if (!key) { showToast('Enter a license key'); return; }

  let type = 'TRIAL';
  if (/^DEV-/i.test(key)) type = 'DEVELOPER';
  else if (/^STD-/i.test(key)) type = 'PRO_STANDARD';
  else if (/^PM-/i.test(key)) type = 'PRO_MONTHLY';
  else if (/^PY-/i.test(key)) type = 'PRO_YEARLY';
  else if (/^ENT-/i.test(key)) type = 'ENTERPRISE_YEARLY';

  const lic = {
    licenseKey: key,
    type,
    issuedAt: Date.now(),
    projectsUsed: 0,
    rebindCount: 0,
    deviceHash: generateDeviceHash(email, phone),
    email: email || '',
    phone: phone || ''
  };

  // Rebind enforcement (except developer)
  const existing = loadLicense();
  if (existing && existing.licenseKey === key && existing.type !== 'DEVELOPER') {
    if (existing.deviceHash !== lic.deviceHash) {
      const allowedRebinds = 2;
      if ((existing.rebindCount || 0) >= allowedRebinds) {
        showToast('Rebind limit reached for this license. Contact support to reassign.');
        return; // abort activation
      } else {
        lic.rebindCount = (existing.rebindCount || 0) + 1;
      }
    } else {
      lic.rebindCount = existing.rebindCount || 0;
    }
  }

  saveLicense(lic);
  updateLicenseStatus();
  showToast('License activated locally');
}


function deactivateLicense() {
  localStorage.removeItem(STORAGE_KEYS.LICENSE);
  updateLicenseStatus();
  showToast('License deactivated');
}

function updateLicenseStatus() {
  const lic = loadLicense();
  const statusEl = $('licenseStatus');
  const infoEl = $('licenseInfo');
  if (!lic) {
    if (statusEl) statusEl.textContent = 'No license activated.';
    if (infoEl) infoEl.textContent = '';
    try { updateLicenseRibbonUI(); } catch(e) {}
    return;
  }
  const typeLabel = lic.type || 'UNKNOWN';
  if (statusEl) statusEl.textContent = `Active license: ${typeLabel}`;
  const parts = [];
  parts.push(`Key: ${lic.licenseKey}`);
  parts.push(`Type: ${typeLabel}`);
  parts.push(`Issued: ${new Date(lic.issuedAt).toLocaleString()}`);
  parts.push(`Projects used: ${lic.projectsUsed || 0}`);
  parts.push(`Rebinds: ${lic.rebindCount || 0}`);
  if (infoEl) infoEl.textContent = parts.join(' | ');
  try { updateLicenseRibbonUI(); } catch(e) {}
}


/* ---------- Project completion & tamper-resilient counting ---------- */
function markProjectCompletedForLicense() {
  try {
    const lic = loadLicense();
    if (!lic) return;
    if (lic.type === 'DEVELOPER') return; // developer bypass

    lic.projectsUsed = (lic.projectsUsed || 0) + 1;
    saveLicense(lic);
    updateLicenseStatus();
    appendProjectLog({ id: window.__lastQuoteMeta?.id || `proj-${Date.now()}`, ts: Date.now(), licenseKey: lic.licenseKey });

    if (lic.type === 'PRO_STANDARD') {
      const limit = LICENSE_TYPES.PRO_STANDARD.expiryProjects || 5;
      if ((lic.projectsUsed || 0) >= limit) {
        lic.expiredByProjectLimit = true;
        saveLicense(lic);
        showToast(`Pro Standard license reached its limit (${limit}). Upgrade to continue.`);
      } else {
        const remaining = limit - (lic.projectsUsed || 0);
        if (remaining === 1) showToast(`Project counted. Only 1 project remaining on this license.`);
        else showToast(`Project counted. ${remaining} project(s) remaining on this license.`);
      }
    } else {
      showToast('Project counted for license.');
    }
    try { updateLicenseRibbonUI(); } catch(e) {}
  } catch (e) { console.warn('markProjectCompletedForLicense failed', e); }
}


function appendProjectLog(entry) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS_LOG);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    localStorage.setItem(STORAGE_KEYS.PROJECTS_LOG, JSON.stringify(arr.slice(-100))); // keep last 100
  } catch (e) { /* ignore */ }
}

function enforceLicenseLimits(lic) {
  try {
    if (!lic) return;
    if (lic.type === 'DEVELOPER') return;
    if (lic.type === 'TRIAL') {
      const issued = lic.issuedAt || Date.now();
      const days = LICENSE_TYPES.TRIAL.expiryDays;
      if (Date.now() - issued > days * 24 * 3600 * 1000) {
        showToast('Trial expired. Please activate a Pro license.');
        deactivateLicense();
      } else if ((lic.projectsUsed || 0) > LICENSE_TYPES.TRIAL.projectsLimit) {
        showToast('Trial project limit reached.');
      }
    }
    if (lic.type === 'PRO_STANDARD') {
      if ((lic.projectsUsed || 0) >= (LICENSE_TYPES.PRO_STANDARD.expiryProjects || 5)) {
        showToast('Pro Standard license has reached its project limit. Upgrade to continue.');
      }
    }
    // monthly/yearly expiry
    if (lic.type === 'PRO_MONTHLY' || lic.type === 'PRO_YEARLY' || lic.type === 'ENTERPRISE_YEARLY') {
      const cfg = LICENSE_TYPES[lic.type];
      if (cfg && cfg.expiryDays) {
        const issued = lic.issuedAt || Date.now();
        if (Date.now() - issued > cfg.expiryDays * 24 * 3600 * 1000) {
          showToast('License expired. Please renew.');
          deactivateLicense();
        }
      }
    }
  } catch (e) { console.warn('enforceLicenseLimits failed', e); }
}

/* ---------- License checks for actions ---------- */
function checkLicensePrivilege(action) {
  const lic = loadLicense();
  if (!lic) return false;
  if (lic.type === 'DEVELOPER') return true;
  // Trial: limited
  if (lic.type === 'TRIAL') {
    // block print/pdf
    if (['print','pdf'].includes(action)) return false;
    // allow viewing sizing, preparing quote
    if (action === 'save_project') {
      // allow up to 2 saved projects
      return (lic.projectsUsed || 0) < (LICENSE_TYPES.TRIAL.projectsLimit || 2);
    }
    return true;
  }
if (lic.type === 'PRO_STANDARD') {
  if (lic.expiredByProjectLimit) return false;
  if ((lic.projectsUsed || 0) >= (LICENSE_TYPES.PRO_STANDARD.expiryProjects || 5)) {
    lic.expiredByProjectLimit = true;
    saveLicense(lic);
    updateLicenseStatus();
    return false;
  }
  return true;
}

}

/* ---------- Guarded actions ---------- */
function guardedExportPdf() {
  if (!checkLicensePrivilege('pdf')) {
    showToast('Your license does not allow PDF export.');
    return;
  }
  exportQuoteToPdf();
}

function guardedPrintQuote() {
  if (!checkLicensePrivilege('print')) {
    showToast('Your license does not allow printing.');
    return;
  }
  printQuote();
}

/* ---------- Init wiring ---------- */
document.addEventListener('DOMContentLoaded', () => {
  try {
    const s = $('appStatus'); if (s) s.textContent = 'Ready';
    const navMap = { navHomeBtn:'home', navSystemBtn:'system', navLicenseBtn:'license', navLoadBtn:'load', navSizingBtn:'sizing', navQuoteBtn:'quote' };
    Object.entries(navMap).forEach(([id,page]) => { const btn = $(id); if (!btn) return; btn.addEventListener('click', () => { showPage(page); }); });

    const dropdownBtn = $('fileDropdownBtn'); if (dropdownBtn) {
      const dropdown = $('fileDropdown');
      dropdownBtn.addEventListener('click', (e) => { e.stopPropagation(); const expanded = dropdown.getAttribute('aria-expanded') === 'true'; dropdown.setAttribute('aria-expanded', expanded ? 'false' : 'true'); });
      document.addEventListener('click', () => dropdown.setAttribute('aria-expanded','false'));
      const dropdownMenu = $('fileDropdownMenu'); if (dropdownMenu) {
        dropdownMenu.addEventListener('click', (e) => {
          const btn = e.target.closest('[role="menuitem"]'); if (!btn) return;
          const action = btn.dataset.action; dropdown.setAttribute('aria-expanded','false');
          switch(action){ case 'new': newProject(); break; case 'open': openProject(); break; case 'save': saveProject(); break; case 'saveAs': saveProjectAs(); break; case 'print': printPage(); break; case 'share': shareProject(); break; case 'exit': exitApp(); break; default: console.info('Unknown action', action); }
        });
      }
    }

    const saveBtn = $('saveSystemBtn'); if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const saved = saveSystemInputsToState();
        if (saved) {
          showToast('System saved');
          showPage('load');
        } else showToast('Could not save system inputs');
      });
    }

    $('resetSystemBtn')?.addEventListener('click', () => {
      if ($('inverterType')) $('inverterType').selectedIndex = 0;
      if ($('inverterRatedPower')) $('inverterRatedPower').value = 5;
      if ($('inverterVoltage')) $('inverterVoltage').value = 230;
      if ($('inverterOutputType')) $('inverterOutputType').value = 'AC';
      if ($('inverterDcBusVoltage')) $('inverterDcBusVoltage').value = 48;
      if ($('inverterEfficiency')) $('inverterEfficiency').value = 95;
      if ($('batteryTypeSelect')) $('batteryTypeSelect').selectedIndex = 0;
      if ($('batteryType')) $('batteryType').value = '';
      if ($('batteryCapacity')) $('batteryCapacity').value = 200;
      if ($('batteryVoltage')) $('batteryVoltage').value = 48;
      if ($('batteryDoD')) $('batteryDoD').value = 80;
      if ($('panelWatt')) $('panelWatt').value = 550;
      if ($('panelVoltage')) $('panelVoltage').value = 40;
      if ($('sunHours')) $('sunHours').value = 5;
      if ($('deratingFactor')) $('deratingFactor').value = 80;
      if ($('autonomyDays')) $('autonomyDays').value = 2;
      if ($('companyName')) $('companyName').value = 'Hunter Functional Telecomms Nigeria Limited';
      if ($('companySlogan')) $('companySlogan').value = 'Reliable Power. Sustainable Future.';
      if ($('companyAddress')) $('companyAddress').value = 'Plot 9 Hon Rufus Oyedepo Street, Silver Land Zone, Thera Annex Estate, Sangotedo';
      if ($('companyLogoUrl')) $('companyLogoUrl').value = '';
      if ($('currencySelector')) $('currencySelector').value = 'NGN';
      if ($('quoteCurrency')) $('quoteCurrency').value = '₦';
      showToast('System reset');
    });

    $('addApplianceBtn')?.addEventListener('click', () => createLoadRow({ name: 'New appliance', qty: 1, power: 100, hours: 1 }));
    $('clearLoadBtn')?.addEventListener('click', () => { if (confirm('Clear all load items?')) { if ($('loadTableBody')) $('loadTableBody').innerHTML = ''; recalcLoadTotals(); } });

    $('calcSizingBtn')?.addEventListener('click', () => { recalcLoadTotals(); calculateSizing(); showPage('sizing'); });

    $('toQuoteBtn')?.addEventListener('click', async () => {
      window.__quoteCustomer = { name: $('customerName')?.value || '', contact: $('customerContact')?.value || '', address: $('customerAddress')?.value || '' };
      await proceedToQuotation();
    });

    $('addQuoteItemBtn')?.addEventListener('click', () => createQuoteRow({ name: 'New item', qty: 1, price: 0 }));
    $('quoteTax')?.addEventListener('input', calculateQuoteTotals);

    // guarded actions
    $('printQuoteBtn')?.addEventListener('click', () => guardedPrintQuote());
    $('exportPdfBtn')?.addEventListener('click', () => guardedExportPdf());

    const currencySelector = $('currencySelector');
    if (currencySelector) {
      currencySelector.addEventListener('input', () => {
        const val = currencySelector.value || '';
        if ($('quoteCurrency')) $('quoteCurrency').value = (val && /[^A-Za-z0-9]/.test(val)) ? val : val.toUpperCase();
      });
    }

    if ($('inverterDcBusVoltage')) attachTooltip('inverterDcBusVoltage', 'This is the inverter DC bus voltage (battery bank voltage). Example: 48 for a 48 V system.');

    if ($('loadTableBody') && !$('loadTableBody').children.length) {
      createLoadRow({ name: 'LED Light', qty: 4, power: 10, hours: 6 });
      createLoadRow({ name: 'Fridge', qty: 1, power: 150, hours: 8 });
    }
    if ($('quoteTableBody') && !$('quoteTableBody').children.length) createQuoteRow({ name: 'Inverter 5kVA', qty: 1, price: 200000 });

    recalcLoadTotals(); calculateSizing(); calculateQuoteTotals();

    // license UI wiring
    $('activateLicenseBtn')?.addEventListener('click', activateLicense);
    $('deactivateLicenseBtn')?.addEventListener('click', deactivateLicense);
    updateLicenseStatus();

    window.addEventListener('hashchange', () => { const prev = document.getElementById('pdfExportWrapper'); if (prev) prev.remove(); });

  } catch (e) { console.error('init failed', e); }
});

/* ---------- proceedToQuotation (keeps header builder usage) ---------- */
async function proceedToQuotation() {
  try {
    const sys = window.__systemSaved || readSystemInputs();
    const sizing = window.__lastSizing || calculateSizing();
    const meta = generateQuoteMeta();
    window.__lastQuoteMeta = meta;

    const qc = $('quoteCurrency');
    if (qc) {
      const sel = sys.currencySelector || '';
      qc.value = (sel && /[^A-Za-z0-9]/.test(sel)) ? sel : sel.toUpperCase() || qc.value;
    }

    const headerContainer = $('quoteHeaderContainer');
    if (headerContainer) {
      headerContainer.innerHTML = '';
      const headerNode = await buildQuoteHeader(sys, meta);
      headerContainer.appendChild(headerNode);
    }

    if ($('quoteTableBody')) $('quoteTableBody').innerHTML = '';
    const suggested = [];
    suggested.push({ name: `Inverter ${sys.inverterRatedPower || ''} kW`, qty: sizing.inverterQty || 1, price: estimateInverterPrice(sys.inverterRatedPower || 5) });
    if ((sizing.batteryQty || 0) > 0) suggested.push({ name: `Battery bank (${sys.batteryType || 'battery'})`, qty: sizing.batteryQty, price: estimateBatteryUnitPrice(sys.batteryType || 'generic') });
    if ((sizing.panelQty || 0) > 0) suggested.push({ name: `Solar panels (${sys.panelWatt || 0} W)`, qty: sizing.panelQty, price: estimatePanelPrice(sys.panelWatt || 550) });

    suggested.forEach(it => { if ((it.qty || 0) > 0) createQuoteRow(it); });

    if (window.__quoteCustomer) {
      if ($('customerName')) $('customerName').value = window.__quoteCustomer.name || '';
      if ($('customerContact')) $('customerContact').value = window.__quoteCustomer.contact || '';
      if ($('customerAddress')) $('customerAddress').value = window.__quoteCustomer.address || '';
    }

    calculateQuoteTotals();
    // === Create Quote Meta (Project Identity) ===
    window.__lastQuoteMeta = {
      id: `QUO-${Date.now()}`,
      date: new Date().toLocaleString()
    };

    // persist project id for licensing
    try { localStorage.setItem('current_project_id', window.__lastQuoteMeta.id); } catch (e) {}

    showPage('quote');
    showToast('Quotation populated from sizing and system inputs.');
  } catch (e) {
    console.error('proceedToQuotation failed', e);
    showToast('Could not proceed to quotation');
  }
}
