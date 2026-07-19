const nodemailer = require('nodemailer');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

let transporter = null;

function buildAccountApprovedEmailMailOptions({ toEmail, toName, loginUrl }) {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const finalLoginUrl = loginUrl || process.env.CLIENT_BASE_URL || 'https://e-gatepass-eight.vercel.app/';

  return {
    from: `"E-PASS — BGI" <${from}>`,
    to: toEmail,
    subject: 'Your account has been approved — Please login',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #E5E8EE;border-radius:12px;">
        <a href="https://res.cloudinary.com/dnldcrhab/image/upload/v1782391118/18561_cxj7ez.png" target="_blank" rel="noopener noreferrer">
          <img src="https://res.cloudinary.com/dnldcrhab/image/upload/v1782391118/18561_cxj7ez.png" alt="Bansal Group of Institutes" style="max-width:180px;height:auto;display:block;margin:0 auto 16px;" />
        </a>
        <h2 style="color:#0A4DAD;margin-bottom:4px;">Account Approved</h2>
        <p style="color:#6B7280;margin-top:0;">Bansal Group of Institutes</p>

        <p>Hello ${toName || ''},</p>
        <p>Your account has been approved. You can now log in to the E-PASS portal.</p>
        <p>Please login using the link below:</p>
        <p><a href="${finalLoginUrl}" style="display:inline-block;padding:10px 16px;background:#0A4DAD;color:#ffffff;text-decoration:none;border-radius:8px;">Login Now</a></p>
        <p style="color:#6B7280;font-size:13px;">If you did not expect this approval, please contact the administrator.</p>

        <hr style="border:none;border-top:1px solid #E5E8EE;margin:24px 0 16px;" />
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="https://res.cloudinary.com/dnldcrhab/image/upload/v1782391118/18561_cxj7ez.png" alt="BGI" style="width:28px;height:28px;object-fit:contain;vertical-align:middle;" />
          <span style="color:#6B7280;font-size:12px;vertical-align:middle;">Bansal Group of Institutes</span>
        </div>
      </div>
    `,
  };
}

async function sendAccountApprovedEmail({ toEmail, toName, loginUrl }) {
  const t = getTransporter();
  if (!t) return false;

  const mailOptions = buildAccountApprovedEmailMailOptions({ toEmail, toName, loginUrl });
  try {
    await t.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('sendAccountApprovedEmail failed:', error?.message || error);
    return false;
  }
}

function getTransporter() {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email (SMTP) not configured — OTP emails will not be sent. Set EMAIL_HOST/EMAIL_USER/EMAIL_PASS in .env');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 465,
    secure: Number(EMAIL_PORT) === 465, // true for port 465, false for 587
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    family: 4, // force IPv4 — avoids ENETUNREACH on hosts without IPv6 route
  });

  return transporter;
}

/**
 * Sends the OTP verification email via Gmail SMTP (or any SMTP provider).
 * Returns true if an email was actually sent, false if SMTP isn't configured
 * (the caller should fall back to showing the OTP on-screen in that case).
 */
async function sendOtpEmail({ toEmail, toName, otp, expiryMinutes }) {
  const t = getTransporter();
  if (!t) return false;

  // DEV: log OTP to server console for local testing/debugging
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log(`[DEV] sendOtpEmail -> OTP for ${toEmail}: ${otp} (valid ${expiryMinutes} minutes)`);
    } catch (e) {}
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  try {
    await t.sendMail({
      from: `"E-PASS — BGI" <${from}>`,
      to: toEmail,
      subject: 'Your E-PASS verification OTP',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #E5E8EE;border-radius:12px;">
          <a href="https://res.cloudinary.com/dnldcrhab/image/upload/v1782391118/18561_cxj7ez.png" target="_blank" rel="noopener noreferrer">
            <img src="https://res.cloudinary.com/dnldcrhab/image/upload/v1782391118/18561_cxj7ez.png" alt="Bansal Group of Institutes" style="max-width:180px;height:auto;display:block;margin:0 auto 16px;" />
          </a>
          <h2 style="color:#0A4DAD;margin-bottom:4px;">E-PASS</h2>
          <p style="color:#6B7280;margin-top:0;">Bansal Group of Institutes</p>

          <p>Hello ${toName || ''},</p>
          <p>Thank you for contacting us. We appreciate your interest in Bansal Group of Institutes.</p>

          <p>Your One-Time Password (OTP) for E-PASS registration is:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#0A4DAD;background:#F7F9FC;padding:16px;text-align:center;border-radius:10px;margin:16px 0;">
            ${otp}
          </div>
          <p style="color:#6B7280;font-size:13px;">This OTP is valid for ${expiryMinutes} minutes. If you didn't request this, you can ignore this email.</p>

          <hr style="border:none;border-top:1px solid #E5E8EE;margin:24px 0 16px;" />
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="https://res.cloudinary.com/dnldcrhab/image/upload/v1783836915/KnW-hQLu_400x400_pdxxua.jpg" alt="BGI" style="width:28px;height:28px;object-fit:contain;vertical-align:middle;" />
            <span style="color:#6B7280;font-size:12px;vertical-align:middle;">Bansal Group of Institutes</span>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('sendOtpEmail failed:', error?.message || error);
    return false;
  }
}

module.exports = { sendOtpEmail, sendAccountApprovedEmail, buildAccountApprovedEmailMailOptions };