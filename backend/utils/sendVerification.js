const nodemailer = require("nodemailer");

const APP_NAME = process.env.APP_NAME || "AI Job Automation";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: !!secure,
      auth: { user, pass },
    });
  }
  return null;
}

/**
 * Send verification code to email. Never throws – logs code to console on any failure.
 */
async function sendEmailVerificationCode(email, code) {
  try {
    let transporter = getTransporter();
    let isTest = false;

    if (!transporter) {
      console.log("No SMTP credentials found. Creating an Ethereal test account for OTP...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      isTest = true;
    }

    const subject = `${APP_NAME} – Your verification code`;
    const html = `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Verification code</h2>
      <p>Use this code to verify your email and activate your account:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1e293b;">${code}</p>
      <p style="color: #64748b; font-size: 14px;">This code expires in 10 minutes.</p>
      <p style="color: #64748b; font-size: 12px;">— ${APP_NAME}</p>
    </div>
  `;
    const text = `Your verification code is: ${code}. It expires in 10 minutes.`;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com",
      to: email,
      subject,
      text,
      html,
    });

    if (isTest) {
      console.log("\n=======================================================");
      console.log(">>> OTP EMAIL SENT TO ETHEREAL (TESTING) <<<");
      console.log(`>>> DEVELOPMENT OTP CODE: ${code}`);
      console.log(">>> PREVIEW URL: %s", nodemailer.getTestMessageUrl(info));
      console.log("=======================================================\n");
    } else {
      console.log(">>> OTP EMAIL SENT TO", email);
    }
  } catch (err) {
    console.error("[Email] error:", err && err.message);
    console.log(">>> FALLBACK VERIFICATION CODE for", email, ":", code);
  }
}

/**
 * Send verification code via SMS (Twilio).
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE in .env and install twilio to enable.
 */
async function sendSmsVerificationCode(phone, code) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE;

  if (!accountSid || !authToken || !from) {
    console.log("[DEV] SMS verification code for", phone, ":", code, "(Twilio not configured)");
    return;
  }

  try {
    const client = require("twilio")(accountSid, authToken);
    await client.messages.create({
      body: `${APP_NAME}: Your verification code is ${code}. Valid for 10 minutes.`,
      from,
      to: phone,
    });
  } catch (err) {
    console.error("Twilio SMS error:", err.message);
    console.log("[DEV] SMS code for", phone, ":", code, "(SMS failed – use this code)");
  }
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = {
  sendEmailVerificationCode,
  sendSmsVerificationCode,
  generateCode,
};
