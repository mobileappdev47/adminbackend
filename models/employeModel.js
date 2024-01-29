const mongoose = require("mongoose"); // Erase if already required
const bcrypt = require("bcrypt");
const crypto = require("crypto");
// Declare the Schema of the Mongo model
var employeeSchema = new mongoose.Schema(
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
    image: [{
      type: String,
    }],
    addedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    activeEmployeeStatus: {
      type: String,
      enum: ['Active', 'In Active'],
      default: 'Active',
    },
    password: {
      type: String,
      required: true,
    },
    newRepairs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repair',
    }],
    newServiceReports: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceReport',
    }],
    newCollectionReports: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollectionReport',
    }],
    refreshToken: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

employeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSaltSync(10);
  this.password = await bcrypt.hash(this.password, salt);
});
employeeSchema.methods.isPasswordMatched = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
employeeSchema.methods.createPasswordResetToken = async function () {
  const resettoken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resettoken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000;
  return resettoken;
};


//Export the model
module.exports = mongoose.model("Employee", employeeSchema);