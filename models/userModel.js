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
    accountStatus: {
      type: Boolean,
      default: false,
    },
     accountActivationDate: {
      type: Date,
    },
    location: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    }],
    employees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    }],
    repairs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repair',
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
  if (this.isNew) {
    // Set the restrictionDate to 2 minutes from now
    this.accountActivationDate = Date.now() + 1 * 24 * 60 * 60 * 1000;

    // Use setTimeout to set accountStatus to true after 2 minutes
    setTimeout(() => {
      this.accountStatus = true;
      this.save(); // Save the document to update the accountStatus
    }, 1 * 24 * 60 * 60 * 1000);
  }

   if (this.isModified("password") || this.isNew) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(this.password, salt);
      this.password = hashedPassword;
    } catch (error) {
      return next(error);
    }
  }

  return next();
  
});

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