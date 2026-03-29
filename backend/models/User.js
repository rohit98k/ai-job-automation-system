const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: "", index: true },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    verificationCodeHash: { type: String, default: "" },
    verificationCodeExpires: { type: Date, default: null },
    phoneVerificationCodeHash: { type: String, default: "" },
    phoneVerificationCodeExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);

