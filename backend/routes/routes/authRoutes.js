const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../../models/User");
const {
  sendEmailVerificationCode,
  sendSmsVerificationCode,
  generateCode,
} = require("../../utils/sendVerification");

const router = express.Router();

const CODE_EXPIRY_MINUTES = 10;

function signToken(user) {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      name: user.name || "",
    },
    secret,
    { expiresIn }
  );
}

function toUserResponse(user) {
  return { id: user._id, name: user.name, email: user.email };
}

// Signup: create user, send verification code to email (and phone if provided). No token until verified.
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const code = generateCode();
    const verificationCodeHash = await bcrypt.hash(code, 10);
    const verificationCodeExpires = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    const user = await User.create({
      name: name || "",
      email: email.toLowerCase(),
      passwordHash,
      phone: (phone || "").trim(),
      emailVerified: false,
      phoneVerified: false,
      verificationCodeHash,
      verificationCodeExpires,
    });

    // Respond first so client always gets success; then send code in background
    res.status(201).json({
      needVerification: true,
      email: user.email,
      message: "Verification code sent. Check email or server console.",
    });

    setImmediate(() => {
      sendEmailVerificationCode(email, code).catch((err) => {
        console.error("Email send error:", err && err.message);
        console.log(">>> VERIFICATION CODE for", user.email, ":", code);
      });
      if (user.phone) {
        sendSmsVerificationCode(user.phone, code).catch(() => {
          console.log(">>> SMS CODE for", user.phone, ":", code);
        });
      }
    });
  } catch (e) {
    next(e);
  }
});

// Verify email with code → activate account and return token
router.post("/verify", async (req, res, next) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: "Email and verification code are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.emailVerified) {
      const token = signToken(user);
      return res.json({ token, user: toUserResponse(user) });
    }

    if (!user.verificationCodeHash || !user.verificationCodeExpires) {
      return res.status(400).json({ error: "No pending verification. Request a new code." });
    }

    if (new Date() > user.verificationCodeExpires) {
      return res.status(400).json({ error: "Verification code expired. Request a new code." });
    }

    const valid = await bcrypt.compare(code, user.verificationCodeHash);
    if (!valid) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    user.emailVerified = true;
    user.verificationCodeHash = "";
    user.verificationCodeExpires = null;
    await user.save();

    const token = signToken(user);
    res.json({ token, user: toUserResponse(user) });
  } catch (e) {
    next(e);
  }
});

// Resend verification code to email
router.post("/resend-code", async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: "Email already verified. You can log in." });
    }

    const code = generateCode();
    user.verificationCodeHash = await bcrypt.hash(code, 10);
    user.verificationCodeExpires = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    res.json({ message: "Verification code sent to your email" });

    setImmediate(() => {
      sendEmailVerificationCode(user.email, code).catch(() => {
        console.log(">>> RESEND CODE for", user.email, ":", code);
      });
      if (user.phone) {
        sendSmsVerificationCode(user.phone, code).catch(() => {
          console.log(">>> SMS CODE for", user.phone, ":", code);
        });
      }
    });
  } catch (e) {
    next(e);
  }
});

// Login: reject if email not verified; otherwise return token
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        needVerification: true,
        email: user.email,
        error: "Please verify your email first. Check your inbox for the code.",
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user);
    res.json({
      token,
      user: toUserResponse(user),
    });
  } catch (e) {
    next(e);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const secret = process.env.JWT_SECRET || "dev-secret-change-me";
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
