const mongoose = require("mongoose");

const collectionReportSchema = new mongoose.Schema({
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location', // Assuming 'Location' is your location model
    required: true,
  },
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
  inNumbers: {
    previous: {
      type: Number,
      required: true,
    },
    current: {
      type: Number,
      required: true,
    },
  },
  outNumbers: {
    previous: {
      type: Number,
      required: true,
    },
    current: {
      type: Number,
      required: true,
    },
  },
  total: {
    type: Number,
    required: true,
  },
  image: {
    type: String, // Assuming you store the image URL or file path
    required: true,
  },
});

module.exports = mongoose.model("CollectionReport", collectionReportSchema);
