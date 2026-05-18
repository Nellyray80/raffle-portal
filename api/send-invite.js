import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { guarantorName, guarantorEmail, beneficiaryName } = req.body ?? {};

  if (!guarantorName || !guarantorEmail) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Use explicitly configured URL, then Vercel's production URL, then current deployment URL
  const appUrl =
    process.env.VITE_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : null);

  const { data, error } = await resend.emails.send({
    from: 'TrustWallet Raffle Portal <hello@taskbed.com>',
    to: guarantorEmail,
    subject: "You've been invited as a Guarantor – TrustWallet Raffle Portal",
    html: buildEmailHtml(guarantorName, beneficiaryName, appUrl),
  });

  if (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, id: data?.id });
}

function buildEmailHtml(guarantorName, beneficiaryName, appUrl) {
  const ctaBlock = appUrl
    ? `<a href="${appUrl}" style="display:inline-block;background:#c9972a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:3px;letter-spacing:.03em;">Register as Guarantor &rarr;</a>`
    : `<p style="font-size:14px;color:#555;">Visit the portal and click <strong>Guarantor Sign Up</strong> to register.</p>`;

  const beneficiaryLine = beneficiaryName
    ? `<p style="font-size:15px;color:#333;margin:0 0 18px;"><strong>${escapeHtml(beneficiaryName)}</strong> has nominated you as their guarantor on the TrustWallet Raffle Portal.</p>`
    : `<p style="font-size:15px;color:#333;margin:0 0 18px;">You have been nominated as a guarantor on the TrustWallet Raffle Portal.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Guarantor Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:#1a3a6b;padding:28px 36px;border-bottom:4px solid #c9972a;">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.1em;font-weight:600;">TrustWallet</p>
              <p style="margin:4px 0 0;font-size:20px;color:#ffffff;font-weight:800;letter-spacing:-.01em;">Raffle Portal</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 36px 28px;">
              <p style="font-size:13px;color:#888;margin:0 0 6px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;">Guarantor Invitation</p>
              <h1 style="margin:0 0 20px;font-size:22px;color:#1a3a6b;font-weight:800;line-height:1.3;">Hello, ${escapeHtml(guarantorName)}</h1>

              ${beneficiaryLine}

              <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">As a guarantor, you will help verify and support their prize claim. Your registration is required before their account can be fully activated.</p>

              <hr style="border:none;border-top:1px solid #e8ecf0;margin:0 0 28px;">

              <!-- Steps -->
              <p style="font-size:13px;font-weight:700;color:#1a3a6b;margin:0 0 14px;text-transform:uppercase;letter-spacing:.06em;">How to register</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="width:28px;vertical-align:top;padding-top:1px;">
                    <span style="display:inline-block;width:22px;height:22px;background:#1a3a6b;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px;border-radius:50%;">1</span>
                  </td>
                  <td style="padding-left:10px;font-size:14px;color:#444;padding-bottom:10px;">Click the button below to open the portal.</td>
                </tr>
                <tr>
                  <td style="width:28px;vertical-align:top;padding-top:1px;">
                    <span style="display:inline-block;width:22px;height:22px;background:#1a3a6b;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px;border-radius:50%;">2</span>
                  </td>
                  <td style="padding-left:10px;font-size:14px;color:#444;padding-bottom:10px;">Choose <strong>Guarantor Sign Up</strong> on the homepage.</td>
                </tr>
                <tr>
                  <td style="width:28px;vertical-align:top;padding-top:1px;">
                    <span style="display:inline-block;width:22px;height:22px;background:#1a3a6b;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px;border-radius:50%;">3</span>
                  </td>
                  <td style="padding-left:10px;font-size:14px;color:#444;">Register using <strong>this email address</strong> — it links your account automatically.</td>
                </tr>
              </table>

              <!-- CTA -->
              <p style="text-align:center;margin:0 0 28px;">
                ${ctaBlock}
              </p>

              <div style="background:#f4f6f9;border-left:4px solid #c9972a;padding:14px 18px;border-radius:2px;margin-bottom:8px;">
                <p style="margin:0;font-size:13px;color:#555;line-height:1.5;"><strong style="color:#1a3a6b;">Important:</strong> You must register using the same email address this invitation was sent to so that the system can link your account automatically.</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f6f9;padding:20px 36px;border-top:1px solid #e0e4ea;">
              <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">This invitation was sent by TrustWallet Raffle Portal. If you did not expect this email, you can safely ignore it.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
