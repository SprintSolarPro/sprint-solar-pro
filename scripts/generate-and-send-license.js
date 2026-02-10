// scripts/generate-and-send-license.js
// Node 18+
// Dependencies: node-fetch (or built-in fetch), nodemailer, uuid
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

const GUMROAD_API_KEY = process.env.GUMROAD_API_KEY;
const PRIVATE_KEY_PEM = process.env.PRIVATE_KEY_PEM;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

if (!GUMROAD_API_KEY || !PRIVATE_KEY_PEM || !SMTP_USER || !SMTP_PASS) {
  console.error('Missing required env vars. Set GUMROAD_API_KEY, PRIVATE_KEY_PEM, SMTP_USER, SMTP_PASS.');
  process.exit(1);
}

const ISSUED_DIR = path.resolve(process.cwd(), 'issued-licenses');
if (!fs.existsSync(ISSUED_DIR)) fs.mkdirSync(ISSUED_DIR, { recursive: true });

// Helper: canonical JSON
function canonicalize(obj) {
  return JSON.stringify(obj);
}

function genLicenseKey(prefix='STD') {
  const r = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}-${r.slice(0,4)}-${r.slice(4,8)}-${r.slice(8,12)}`;
}

function signPayload(payload) {
  const canonical = canonicalize(payload);
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(canonical);
  sign.end();
  const signature = sign.sign(PRIVATE_KEY_PEM, 'base64');
  return signature;
}

async function fetchRecentSales() {
  // Gumroad API: https://gumroad.com/api
  // This example uses the "sales" endpoint; adapt to your product filters.
  const url = `https://api.gumroad.com/v2/sales?access_token=${encodeURIComponent(GUMROAD_API_KEY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gumroad API error: ${res.status}`);
  const json = await res.json();
  return json.sales || [];
}

async function sendEmail(to, subject, text, attachmentName, attachmentContent) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  const mail = {
    from: `"Sprint Solar Pro" <${SMTP_USER}>`,
    to,
    subject,
    text,
    attachments: [
      { filename: attachmentName, content: attachmentContent }
    ]
  };

  const info = await transporter.sendMail(mail);
  return info;
}

(async function main() {
  try {
    console.log('Fetching recent Gumroad sales...');
    const sales = await fetchRecentSales();
    console.log('Sales fetched:', sales.length);

    // Load processed log to avoid duplicates
    const processedPath = path.join(ISSUED_DIR, 'processed.json');
    let processed = [];
    if (fs.existsSync(processedPath)) processed = JSON.parse(fs.readFileSync(processedPath, 'utf8'));

    for (const sale of sales) {
      const saleId = sale.id || sale.sale_id || sale.purchase_id || sale.transaction_id || sale.sale_id;
      if (!saleId) continue;
      if (processed.includes(saleId)) continue;

      // Extract buyer email and product info
      const buyerEmail = sale.email || (sale.variants && sale.variants[0] && sale.variants[0].email) || sale.purchaser_email || sale.buyer_email;
      if (!buyerEmail) {
        console.warn('No buyer email for sale', saleId, 'skipping');
        processed.push(saleId);
        continue;
      }

      // Determine tier from product_id or product_name
      const productName = sale.product_name || sale.product_title || (sale.product && sale.product.name) || 'PRO_STANDARD';
      // Map productName to license type and limits as you prefer
      const type = productName.toUpperCase().includes('MONTH') ? 'PRO_MONTHLY' : 'PRO_STANDARD';
      const projectsLimit = type === 'PRO_STANDARD' ? 5 : 9999;

      const licenseKey = genLicenseKey(type === 'PRO_STANDARD' ? 'STD' : 'PM');
      const payload = {
        licenseKey,
        type,
        issuedAt: Date.now(),
        projectsUsed: 0,
        projectsLimit,
        email: buyerEmail,
        phone: '',
        deviceHash: null,
        rebindCount: 0
      };

      const signature = signPayload(payload);
      const signed = { payload, signature };

      // Save file
      const outName = `license-${licenseKey}.json`;
      const outPath = path.join(ISSUED_DIR, outName);
      fs.writeFileSync(outPath, JSON.stringify(signed, null, 2), 'utf8');

      // Email buyer
      const subject = `Your Sprint Solar Pro license (${licenseKey})`;
      const text = `Hello,\n\nAttached is your Sprint Solar Pro license file. To activate: open the app, go to License → Import license file, and paste or upload the attached JSON file. The license will bind to this device on first activation.\n\nIf you need help, reply to this email.\n\nThanks,\nSprint Solar Pro`;
      await sendEmail(buyerEmail, subject, text, outName, JSON.stringify(signed, null, 2));
      console.log('Issued license', licenseKey, 'to', buyerEmail);

      // Record processed
      processed.push(saleId);
      fs.writeFileSync(processedPath, JSON.stringify(processed, null, 2), 'utf8');
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error in license issuance:', err);
    process.exit(1);
  }
})();
