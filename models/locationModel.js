const mongoose = require("mongoose"); // Erase if already required

const locationSchema = new mongoose.Schema(
    {
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Assuming you have a User model
        },
        locationname: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        percentage: {
            type: String,
            required: true
        },
        machines: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Machine"
        }],
        employees: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Emplyoee"
        }],
        numofmachines: {
            type: Number,
            default: 0
        },
        activeStatus: {
            type: String,
            enum: ['Active', 'Pending', 'Closed'], // Define the allowed statuses
            default: 'Active', // Set a default status if needed
        },
    },
    {
        timestamps: true,
    }
);



module.exports = mongoose.model("Location", locationSchema);