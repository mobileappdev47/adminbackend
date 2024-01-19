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
  location: {
    type: String,
  },
  statusOfRepair: {
    type: String,
    enum: ['Done', 'Pending', 'Running'],
    default: 'Done', // Set a default status if needed
    required: true,
  },
  issue: {
    type: String,
  },
  image: {
    type: String, 
  },
});

module.exports = mongoose.model("Repair", repairSchema);
