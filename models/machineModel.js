const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
const machineSchema = new mongoose.Schema(
    {
        machineNumber: {
            type: String,
            // required: true,
        },
        serialNumber: {
            type: String,
            // required: true,
            unique: true,
        },
        activeMachineStatus: {
            type: String,
            enum: ['Active', 'In Service'], 
            default: 'Active', 
        },
        employees: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee"
        }],
        
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Machine", machineSchema);