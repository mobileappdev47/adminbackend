const mongoose = require("mongoose");

const repairSchema = new mongoose.Schema({
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
});

module.exports = mongoose.model("Repair", repairSchema);
