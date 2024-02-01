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
        inNumbers: {
            previous: {
                type: Number,
                default: '0',
                required: true,
            },
            current: {
                type: Number,
                default: '0',
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
            type: String,
        },
        gameName: {
            type: String,
        },
        location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Location",
        },
        image: [{
            type: String
        }],
        date: {
            type: Date
        },
        time: {
            type: String,
        },
        reporterName: {
            type: String,
        },
        statusOfRepair: {
            type: String,
            enum: ['Done', 'Pending', 'Running'],
            default: 'Pending', // Set a default status if needed
        },
        imageOfRepair: [{
            type: String
        }],
        issue: {
            type: String
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