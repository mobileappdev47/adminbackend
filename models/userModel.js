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
    blocked: {
      type: Boolean,
      default: false, // Admin is not blocked by default
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
    }
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSaltSync(10);
  this.password = await bcrypt.hash(this.password, salt);
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