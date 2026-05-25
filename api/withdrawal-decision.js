import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { transactionId, status, adminNote } = req.body ?? {};
  if (!transactionId || !status) return res.status(400).json({ error: 'Missing fields' });

  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (!tx) return res.status(404).json({ error: 'Transaction not found' });

  const beneficiaryId = tx.on_behalf_of;

  const [{ data: ben }, { data: guar }] = await Promise.all([
    supabase.from('beneficiaries')
      .select('first_name, last_name, email, account_id')
      .eq('id', beneficiaryId)
      .single(),
    supabase.from('guarantors')
      .select('first_name, last_name, email')
      .eq('beneficiary_id', beneficiaryId)
      .maybeSingle(),
  ]);

  const appUrl =
    process.env.VITE_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : '');

  const sends = [];

  if (status === 'rejected') {
    if (ben) {
      sends.push(resend.emails.send({
        from: 'TrustWallet Raffle Portal <hello@taskbed.com>',
        to: ben.email,
        subject: 'Withdrawal Request Declined – TrustWallet Raffle Portal',
        html: beneficiaryRejectedEmail(ben, tx, adminNote),
      }));
    }
    if (guar) {
      sends.push(resend.emails.send({
        from: 'TrustWallet Raffle Portal <hello@taskbed.com>',
        to: guar.email,
        subject: `Action May Be Required – ${ben ? ben.first_name + ' ' + ben.last_name + "'s" : 'A'} Withdrawal Was Declined`,
        html: guarantorRejectedEmail(guar, ben, tx, adminNote, appUrl),
      }));
    }
  } else if (status === 'approved') {
    if (ben) {
      sends.push(resend.emails.send({
        from: 'TrustWallet Raffle Portal <hello@taskbed.com>',
        to: ben.email,
        subject: 'Withdrawal Request Approved – TrustWallet Raffle Portal',
        html: beneficiaryApprovedEmail(ben, tx, adminNote),
      }));
    }
  }

  await Promise.allSettled(sends);
  return res.status(200).json({ success: true });
}

/* ─── EMAIL TEMPLATES ──────────────────────────────────────── */

function header() {
  return `
    <tr>
      <td style="background:#1a3a6b;padding:28px 36px;border-bottom:4px solid #c9972a;">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.1em;font-weight:600;">TrustWallet</p>
        <p style="margin:4px 0 0;font-size:20px;color:#ffffff;font-weight:800;letter-spacing:-.01em;">Raffle Portal</p>
      </td>
    </tr>`;
}

function footer() {
  return `
    <tr>
      <td style="background:#f4f6f9;padding:20px 36px;border-top:1px solid #e0e4ea;">
        <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">This is an automated message from TrustWallet Raffle Portal. Please do not reply to this email.</p>
      </td>
    </tr>`;
}

function wrap(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        ${header()}
        ${content}
        ${footer()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function fmtAmount(amount) {
  return '$' + parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function reasonBox(note) {
  if (!note) return '';
  return `
    <div style="background:#fff3cd;border-left:4px solid #c9972a;padding:14px 18px;border-radius:2px;margin:20px 0;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#7a5c00;text-transform:uppercase;letter-spacing:.06em;">Reason for Decline</p>
      <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">${esc(note)}</p>
    </div>`;
}

function txSummary(tx) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;border-radius:3px;padding:16px 18px;margin:20px 0;font-size:13px;">
      <tr>
        <td style="padding:4px 0;color:#888;width:140px;">Amount Requested</td>
        <td style="padding:4px 0;font-weight:700;color:#1a3a6b;">${fmtAmount(tx.amount)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#888;">Bank</td>
        <td style="padding:4px 0;font-weight:600;color:#333;">${esc(tx.bank_name)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#888;">Account Holder</td>
        <td style="padding:4px 0;font-weight:600;color:#333;">${esc(tx.account_holder_name)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#888;">Account No.</td>
        <td style="padding:4px 0;font-weight:600;color:#333;">···· ${esc(String(tx.account_number).slice(-4))}</td>
      </tr>
    </table>`;
}

function beneficiaryRejectedEmail(ben, tx, note) {
  return wrap(`
    <tr>
      <td style="background:#ffffff;padding:36px 36px 28px;">
        <p style="font-size:13px;color:#b81c1c;margin:0 0 6px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;">Withdrawal Declined</p>
        <h1 style="margin:0 0 20px;font-size:22px;color:#1a3a6b;font-weight:800;line-height:1.3;">Hello, ${esc(ben.first_name)}</h1>
        <p style="font-size:15px;color:#333;margin:0 0 4px;line-height:1.6;">
          We're sorry to inform you that your withdrawal request has been <strong style="color:#b81c1c;">declined</strong> by our review team.
        </p>
        ${txSummary(tx)}
        ${reasonBox(note)}
        <p style="font-size:14px;color:#555;line-height:1.6;margin:0;">
          If you believe this decision was made in error or need further assistance, please contact our support team or ask your guarantor to submit a withdrawal request on your behalf.
        </p>
      </td>
    </tr>`);
}

function beneficiaryApprovedEmail(ben, tx, note) {
  const noteBlock = note
    ? `<div style="background:#e8f5ee;border-left:4px solid #1b6b42;padding:14px 18px;border-radius:2px;margin:20px 0;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#1b6b42;text-transform:uppercase;letter-spacing:.06em;">Note from Review Team</p>
        <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">${esc(note)}</p>
      </div>`
    : '';
  return wrap(`
    <tr>
      <td style="background:#ffffff;padding:36px 36px 28px;">
        <p style="font-size:13px;color:#1b6b42;margin:0 0 6px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;">Withdrawal Approved</p>
        <h1 style="margin:0 0 20px;font-size:22px;color:#1a3a6b;font-weight:800;line-height:1.3;">Hello, ${esc(ben.first_name)}</h1>
        <p style="font-size:15px;color:#333;margin:0 0 4px;line-height:1.6;">
          Great news — your withdrawal request has been <strong style="color:#1b6b42;">approved</strong> by our review team.
        </p>
        ${txSummary(tx)}
        ${noteBlock}
        <p style="font-size:14px;color:#555;line-height:1.6;margin:0;">
          Funds are typically processed within <strong>3–5 business days</strong>. If you have any questions, please contact our support team.
        </p>
      </td>
    </tr>`);
}

function guarantorRejectedEmail(guar, ben, tx, note, appUrl) {
  const benName = ben ? `${ben.first_name} ${ben.last_name}` : 'the beneficiary';
  const ctaBlock = appUrl
    ? `<p style="text-align:center;margin:28px 0 0;">
        <a href="${appUrl}" style="display:inline-block;background:#c9972a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 30px;border-radius:3px;letter-spacing:.03em;">Log In to Submit Request &rarr;</a>
      </p>`
    : '';
  return wrap(`
    <tr>
      <td style="background:#ffffff;padding:36px 36px 28px;">
        <p style="font-size:13px;color:#b81c1c;margin:0 0 6px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;">Guarantor Notice</p>
        <h1 style="margin:0 0 20px;font-size:22px;color:#1a3a6b;font-weight:800;line-height:1.3;">Hello, ${esc(guar.first_name)}</h1>
        <p style="font-size:15px;color:#333;margin:0 0 4px;line-height:1.6;">
          We are notifying you that a withdrawal request submitted by <strong>${esc(benName)}</strong> — the beneficiary you are linked to — has been <strong style="color:#b81c1c;">declined</strong>.
        </p>
        ${txSummary(tx)}
        ${reasonBox(note)}

        <hr style="border:none;border-top:1px solid #e8ecf0;margin:24px 0;">

        <div style="background:#eef3fb;border-left:4px solid #1a3a6b;padding:16px 20px;border-radius:2px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1a3a6b;text-transform:uppercase;letter-spacing:.06em;">Your Authority as Guarantor</p>
          <p style="margin:0;font-size:14px;color:#333;line-height:1.7;">
            As the registered guarantor for <strong>${esc(benName)}</strong>, you have the authority to <strong>submit a withdrawal request on their behalf</strong>. If ${esc(ben ? ben.first_name : 'the beneficiary')} is experiencing difficulties accessing their account or is unable to submit a request themselves, you may log in to your guarantor dashboard and initiate the withdrawal for them.
          </p>
        </div>
        ${ctaBlock}
      </td>
    </tr>`);
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
