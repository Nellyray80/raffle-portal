import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body ?? {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  const normalizedEmail = email.trim().toLowerCase();

  // Search both tables — always return 200 to avoid email enumeration
  let userType = null;
  let firstName = '';

  const { data: ben } = await supabase
    .from('beneficiaries')
    .select('id, first_name')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (ben) {
    userType = 'beneficiary';
    firstName = ben.first_name;
  } else {
    const { data: gua } = await supabase
      .from('guarantors')
      .select('id, first_name')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (gua) {
      userType = 'guarantor';
      firstName = gua.first_name;
    }
  }

  if (!userType) return res.status(200).json({ success: true });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await supabase.from('password_resets').insert([{
    email: normalizedEmail,
    user_type: userType,
    token,
    expires_at: expiresAt,
  }]);

  const appUrl =
    process.env.VITE_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : '');

  const resetLink = `${appUrl}?token=${token}`;

  await resend.emails.send({
    from: 'TrustWallet Raffle Portal <hello@taskbed.com>',
    to: normalizedEmail,
    subject: 'Reset your password – TrustWallet Raffle Portal',
    html: buildResetEmail(firstName, resetLink),
  });

  return res.status(200).json({ success: true });
}

function buildResetEmail(firstName, resetLink) {
  const greeting = firstName ? `Hello, ${escapeHtml(firstName)}` : 'Hello';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <tr>
          <td style="background:#1a3a6b;padding:28px 36px;border-bottom:4px solid #c9972a;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.1em;font-weight:600;">TrustWallet</p>
            <p style="margin:4px 0 0;font-size:20px;color:#ffffff;font-weight:800;letter-spacing:-.01em;">Raffle Portal</p>
          </td>
        </tr>

        <tr>
          <td style="background:#ffffff;padding:36px 36px 28px;">
            <p style="font-size:13px;color:#888;margin:0 0 6px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;">Password Reset</p>
            <h1 style="margin:0 0 20px;font-size:22px;color:#1a3a6b;font-weight:800;">${greeting}</h1>
            <p style="font-size:15px;color:#333;margin:0 0 24px;line-height:1.6;">We received a request to reset the password for your account. Click the button below to choose a new one.</p>
            <p style="text-align:center;margin:0 0 28px;">
              <a href="${resetLink}" style="display:inline-block;background:#c9972a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:3px;letter-spacing:.03em;">Reset My Password &rarr;</a>
            </p>
            <div style="background:#f4f6f9;border-left:4px solid #1a3a6b;padding:14px 18px;border-radius:2px;margin-bottom:8px;">
              <p style="margin:0;font-size:13px;color:#555;line-height:1.5;">This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password has not been changed.</p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="background:#f4f6f9;padding:20px 36px;border-top:1px solid #e0e4ea;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">TrustWallet Raffle Portal · If the button above doesn't work, copy and paste this link into your browser: <span style="color:#1a3a6b;word-break:break-all;">${resetLink}</span></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
