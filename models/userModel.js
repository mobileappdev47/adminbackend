const mongoose = require("mongoose"); // Erase if already required
const bcrypt = require("bcrypt");
const crypto = require("crypto");
// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "admin",
    },
    status: {
      type: String,
      enum: ['paid', 'unpaid'], // Example statuses, modify as needed
      default: 'unpaid', // Default status
    },
    accountValid: {
      type: Boolean,
      default: false, // Admin is not blocked by default
    },
    freeTrialDuration: {
      type: Number, // The duration for the trial period in milliseconds
      default: 1 * 60 * 1000, // Default: 1 minute in milliseconds
    },
    location: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    }],
    employees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    }],
    refreshToken: {
      type: String,
    },
    restrictionDate: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
});

userSchema.methods.isPasswordMatched = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createPasswordResetToken = async function () {
  const resettoken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resettoken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000;
  return resettoken;
};

//Export the model
module.exports = mongoose.model("User", userSchema);