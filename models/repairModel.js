const mongoose = require("mongoose");

const repairSchema = new mongoose.Schema({
  machineNumber: {
    type: String,
    required: true,
  },
  serialNumber: {
    type: String,
    required: true,
  },
  auditNumber: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  reporterName: {
    type: String,
    required: true,
  },
  statusOfRepair: {
    type: String,
    enum: ['Done', 'Pending', 'Running'],
    default: 'Done', // Set a default status if needed
    required: true,
  },
  issue: {
    type: String,
    required: true,
  },
  image: {
    type: String, // Assuming you store the image URL or file path
    required: true,
  },
});

module.exports = mongoose.model("Repair", repairSchema);
