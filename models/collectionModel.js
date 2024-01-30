const mongoose = require("mongoose");

const collectionReportSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
  },
  machines: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
  }],
},
  {
    timestamps: true
  });

module.exports = mongoose.model("CollectionReport", collectionReportSchema);
