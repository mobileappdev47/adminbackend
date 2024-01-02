const genrateToken = require("../config/jwtToken");
const User = require("../models/userModel");
const Employee = require("../models/employeModel")
const asyncHandler = require("express-async-handler");
const validateMongodbId = require("../utils/validateMongodbid");
const genrateRefreshToken = require("../config/refreshToken");
const Location = require('../models/locationModel')
const Machine = require('../models/machineModel')
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require('mongoose')

// create admin and superadmin
const createUser = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const findUser = await User.findOne({ email: email });
  if (!findUser) {
    const newUser = await User.create(req.body);
    res.json(newUser);
  } else {
  }
});


//login admin
const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findUser = await User.findOne({ email });

  if (findUser) {
    if (findUser.blocked) {
      throw new Error("User is blocked. Contact support for assistance.");
    }

    const currentDate = new Date();
    const restrictionDate = findUser.restrictionDate;

    if (!restrictionDate || restrictionDate > currentDate) {
      if (await findUser.isPasswordMatched(password)) {
        const refreshToken = genrateRefreshToken(findUser?._id);
        const updateUser = await User.findByIdAndUpdate(
          findUser.id,
          {
            refreshToken: refreshToken,
          },
          {
            new: true,
          }
        );

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          maxAge: 72 * 60 * 60 * 1000,
        });

        res.json({
          _id: findUser?._id,
          firstname: findUser?.firstname,
          lastname: findUser?.lastname,
          phone: findUser?.phone,
          email: findUser?.email,
          role: findUser?.role,
          restrictionDate: findUser?.restrictionDate,
          token: genrateToken(findUser?._id),
        });
      } else {
        throw new Error("Invalid Credentials");
      }
    } else {
      throw new Error("Restricted");
    }
  } else {
    throw new Error("User not found");
  }
});


//login super admin
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findAdmin = await User.findOne({ email });
  if (findAdmin.role !== "superadmin") throw new Error("Not Authorized");
  if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
    const refreshToken = genrateRefreshToken(findAdmin?._id);
    const updateuser = await User.findByIdAndUpdate(
      findAdmin.id,
      {
        refreshToken: refreshToken,
      },
      {
        new: true,
      }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findAdmin?._id,
      firstname: findAdmin?.firstname,
      lastname: findAdmin?.lastname,
      email: findAdmin?.email,
      phone: findAdmin?.phone,
      token: genrateToken(findAdmin?._id),
    });
  } else {
    throw new Error("Invalid Crendantials");
  }
});

// get a admin
const getaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  try {
    const getaUser = await User.findById(id).populate({
      path: 'location',
      populate: {
        path: 'machines',
        model: 'Machine',
      }
    })
    .exec();
    if (getaUser) {
      const updatedUser = await getaUser.save();
      res.json({
        getaUser: updatedUser
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// add restriction date
const addRestrictionDate = asyncHandler(async(req, res) => {
  const { userId } = req.params;
  const { newRestrictionDate } = req.body; // Assuming new restriction date is sent in the request body

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the restriction date
    user.restrictionDate = newRestrictionDate;
    await user.save();

    return res.status(200).json({ message: 'Restriction date updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
})


// delete a admin
const deleteaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const deleteaUser = await User.findByIdAndDelete(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});


// update status of paid in admin
const updateStatusUser = asyncHandler(async(req, res) => {
  try {
    const { adminId } = req.params;

    // Find the user by ID
    const user = await User.findById(adminId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if the user making the request is a superadmin or admin
    const { role } = req.admin; // Assuming the user's role is stored in req.user
    if (role !== 'superadmin' && role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized: Insufficient privileges.' });
    }

    // Check if the user found by ID is an admin or superadmin
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized: User is not an admin.' });
    }

    const { status } = req.body; // Get the new status from the request body

    // Update the status of the admin user
    const adminToUpdate = await User.findByIdAndUpdate(
      adminId,
      { status },
      { new: true } // To get the updated document
    );

    if (!adminToUpdate) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    return res.status(200).json({ message: 'Admin status updated successfully.', admin: adminToUpdate });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
})

// update a admin
const updatedUser = asyncHandler(async (req, res) => {
  const { _id, role } = req.admin;
  validateMongodbId(_id);

  if (role !== 'superadmin') {
    return res.status(403).json({ message: 'Unauthorized: Only super admins can update admin.' });
  }

  try {
    const { id } = req.params;
    const userToUpdate = await User.findById(id);

    if (!userToUpdate) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    userToUpdate.firstname = req?.body?.firstname || userToUpdate.firstname;
    userToUpdate.lastname = req?.body?.lastname || userToUpdate.lastname;
    userToUpdate.address = req?.body?.address || userToUpdate.address;
    userToUpdate.phone = req?.body?.phone || userToUpdate.phone;
    userToUpdate.status = req?.body?.status || userToUpdate.status;

    const updatedUser = await userToUpdate.save();

    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});


// search and all admins
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const { searchuser } = req.query;
    let users;

    if (!searchuser) {
      users = await User.find({ role: { $ne: 'superadmin' } });
    } else {
      users = await User.find({
        $and: [
          { role: { $ne: 'superadmin' } },
          { firstname: { $regex: new RegExp(searchuser, 'i') } }
        ]
      });
    }
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//blockes admin
const blockedAdmin  = asyncHandler(async (req,res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.blocked) {
      return res.status(400).json({ message: 'User is already blocked' });
    }

    user.blocked = true;
    await user.save();

    res.status(200).json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// unblocked admin

const unblockedAdmin  = asyncHandler( async ( req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.blocked) {
      return res.status(400).json({ message: 'User is not blocked' });
    }

    user.blocked = false;
    await user.save();

    res.status(200).json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
})

//get all emloyee
const getAllEmployee = asyncHandler(async(req, res) => {
  try {
    const { searchEmployee } = req.query;
    let employees;

    if (searchEmployee) {
      employees = await Employee.find({
        firstname: { $regex: new RegExp(searchEmployee, 'i') }
      });
    } else {
      employees = await Employee.find({});
    }

    res.json({ employees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

// user add machine
const addMachineToUserLocation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { locationId, employeeIds } = req.body; // Get locationId and employeeIds from the request body

  try {
    const user = await User.findById(userId).populate('location');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const location = user.location.find(loc => loc._id.toString() === locationId);
    if (!location) {
      return res.status(404).json({ message: 'Location not found for the user' });
    }

    const { machineName, serialNumber } = req.body;
    const newMachine = new Machine({ machineName, serialNumber });

    newMachine.employees = employeeIds; 

    await newMachine.save();

    location.machines = location.machines || [];
    location.machines.push(newMachine._id);

    if (location instanceof mongoose.Document) {
      await location.save();
      const updatedUser = await User.findById(userId)
        .populate({
          path: 'location',
          populate: {
            path: 'machines',
            model: 'Machine'
          }
        })
        .exec();
      res.json({ message: 'New machine added to location successfully', updatedUser });
    } else {
      return res.status(500).json({ error: 'Error saving location' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// update machine
const updateMachineInUserLocation = asyncHandler(async (req, res) => {
  const { userId, machineId, locationId } = req.params; // Extract locationId from params
  const { machineName, serialNumber, employeeIds } = req.body; // No need to add locationId

  try {
    const updatedMachine = await Machine.findByIdAndUpdate(
      machineId,
      { machineName, serialNumber, location: locationId }, // Set locationId for the machine
      { new: true }
    );

    if (!updatedMachine) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    // Update employees for the machine
    updatedMachine.employees = employeeIds; // Assuming employeeIds is an array of employee IDs

    await updatedMachine.save();

    const updatedUser = await User.findById(userId)
      .populate({
        path: 'location',
        populate: {
          path: 'machines',
          model: 'Machine'
        }
      })
      .exec();

    res.json({ message: 'Machine details updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});






// delete machine
const deleteMachineFromUser = asyncHandler(async (req, res) => {
  const { userId, locationId, machineId } = req.params;

  try {
    const user = await User.findById(userId).populate('location');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const location = user.location.find(loc => loc._id.toString() === locationId);
    if (!location) {
      return res.status(404).json({ message: 'Location not found for the user' });
    }

    const machineIndex = location.machines.findIndex(mach => mach._id.toString() === machineId);
    if (machineIndex === -1) {
      return res.status(404).json({ message: 'Machine not found in this location' });
    }

    const deletedMachine = location.machines[machineIndex];
    location.machines.splice(machineIndex, 1);

    await Machine.findByIdAndDelete(machineId); // Remove machine from the database

    await location.save();

    const updatedUser = await User.findById(userId)
      .populate({
        path: 'location',
        populate: {
          path: 'machines',
          model: 'Machine'
        }
      })
      .exec();

    res.json({ message: 'Machine deleted successfully', updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});





// get a machines 
const getMachinesOfUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const userWithLocationsAndMachines = await User.findById(userId)
      .populate({
        path: 'location',
        populate: {
          path: 'machines',
          model: 'Machine',
          populate: {
            path: 'employees',
            model: 'Employee'
          }
        }
      })
      .exec();

    if (!userWithLocationsAndMachines) {
      return res.status(404).json({ message: 'User not found' });
    }
    const updatedUser = await User.findById(userId)
        .populate({
          path: 'location',
          populate: {
            path: 'machines',
            model: 'Machine',
            populate: {
              path: 'employees',
              model: 'Employee'
            }
          }
        })
        .exec();

    res.json({ machines: updatedUser.location });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// get location machine detail
const getMachinesByLocationId = asyncHandler(async (req, res) => {
  const { locationId } = req.params; 

  try {
    const location = await Location.findById(locationId).populate('machines').exec();

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const machinesOfLocation = location.machines;

    res.json({ machinesOfLocation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// get location by id
const getMachinebyId = asyncHandler(async (req, res) => {
  try {
    const { machineId,userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const machine = await Machine.findOne({ _id: machineId });
    if (!machine) {
      return res.status(404).json({ message: 'machine not found' });
    }
    if (!user.machines.includes(machineId)) {
      return res.status(403).json({ message: 'machine does not belong to the user' });
    }

    res.json({ machine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})


module.exports = { createUser, loginUserCtrl, loginAdmin,addRestrictionDate, getAllUsers,getAllEmployee, getaUser, deleteaUser, updatedUser,updateStatusUser, addMachineToUserLocation, updateMachineInUserLocation,
   deleteMachineFromUser, getMachinesOfUser, getMachinebyId, getMachinesByLocationId, blockedAdmin, unblockedAdmin }
