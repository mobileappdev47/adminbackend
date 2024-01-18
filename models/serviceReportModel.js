const mongoose = require("mongoose");

const serviceReportSchema = new mongoose.Schema({
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
  employeeName: {
    type: String,
    required: true,
  },
  serviceRequested: {
    type: String,
    required: true,
  },
  image: {
    type: String, // Assuming you store the image URL or file path
    required: true,
  },
});

module.exports = mongoose.model("ServiceReport", serviceReportSchema);
