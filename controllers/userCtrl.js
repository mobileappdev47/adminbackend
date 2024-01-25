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
const Repair = require('../models/repairModel')

// create admin and superadmin

const createSuperAdmin = asyncHandler(async (req, res) => {
  try {
    const email = req.body.email;
    const findUser = await User.findOne({ email: email });

    if (!findUser) {
      const newUser = await User.create({ ...req.body, role: 'superadmin' });
      res.status(201).json({ success: true, user: newUser });
    } else {
      res.status(400).json({ success: false, message: 'User with this email already exists' });
    }
  } catch (error) {
    console.error('Error creating superadmin:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

const createUser = asyncHandler(async (req, res) => {
  try {
    const email = req.body.email;
    const findUser = await User.findOne({ email: email });

    if (!findUser) {
      const newUser = await User.create(req.body);
      res.status(201).json({ success: true, user: newUser }); // Added success flag and user object
    } else {
      res.status(400).json({ success: false, message: 'User with this email already exists' }); // Added success flag and error message
    }
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' }); // Added success flag and error message
  }
});


//login admin
const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findUser = await User.findOne({ email });

  if (findUser) {
    if (findUser.blocked) {
      res.status(403).json({ success: false, message: "User is blocked. Contact support for assistance." });
    } else {
      const currentDate = new Date();
      const restrictionDate = findUser.restrictionDate;

      if (!restrictionDate || restrictionDate > currentDate) {
        if (await findUser.isPasswordMatched(password)) {
          const refreshToken = genrateRefreshToken(findUser?._id);
          const updateUser = await User.findByIdAndUpdate(
            findUser.id,
            { refreshToken },
            { new: true }
          );

          res.cookie("refreshToken", refreshToken, { httpOnly: true, maxAge: 72 * 60 * 60 * 1000 });

          res.json({
            success: true,
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
          res.status(401).json({ success: false, message: "Invalid Credentials" });
        }
      } else {
        res.status(403).json({ success: false, message: "Restricted" });
      }
    }
  } else {
    res.status(404).json({ success: false, message: "User not found" });
  }
});



//login super admin
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findAdmin = await User.findOne({ email });

  if (!findAdmin || findAdmin.role !== "superadmin" || !(await findAdmin.isPasswordMatched(password))) {
    res.status(401).json({ success: false, message: "Invalid Credentials" });
  } else {
    const refreshToken = genrateRefreshToken(findAdmin?._id);
    const updatedUser = await User.findByIdAndUpdate(
      findAdmin.id,
      { refreshToken },
      { new: true }
    );

    res.cookie("refreshToken", refreshToken, { httpOnly: true, maxAge: 72 * 60 * 60 * 1000 });

    res.json({
      success: true,
      _id: findAdmin?._id,
      firstname: findAdmin?.firstname,
      lastname: findAdmin?.lastname,
      email: findAdmin?.email,
      phone: findAdmin?.phone,
      token: genrateToken(findAdmin?._id),
    });
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
      },
    }).exec();

    if (getaUser) {
      const updatedUser = await getaUser.save();
      res.json({ success: true, getaUser: updatedUser });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// add restriction date
const addRestrictionDate = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { newRestrictionDate } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update the restriction date
    user.restrictionDate = newRestrictionDate;
    await user.save();

    return res.status(200).json({ success: true, message: 'Restriction date updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


// delete a admin
const deleteaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


// update status of paid in admin
const updateStatusUser = asyncHandler(async (req, res) => {
  try {
    const { adminId } = req.params;

    // Find the user by ID
    const user = await User.findById(adminId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { role } = req.admin; // Assuming the user's role is stored in req.user
    if (role !== 'superadmin' && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized: Insufficient privileges.' });
    }

    // Check if the user found by ID is an admin or superadmin
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not superadmin.' });
    }

    const { status } = req.body; // Get the new status from the request body

    // Check if the user is already marked as paid
    if (user.status === 'paid' && status === 'paid') {
      return res.status(400).json({ success: false, message: 'User is already paid.' });
    }

    // Update the status of the admin user
    const adminToUpdate = await User.findByIdAndUpdate(
      adminId,
      { status },
      { new: true } // To get the updated document
    );

    if (!adminToUpdate) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    return res.status(200).json({ success: true, message: 'Admin status updated successfully.', admin: adminToUpdate });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


// update a admin
const updatedUser = asyncHandler(async (req, res) => {
  const { _id, role } = req.admin;
  validateMongodbId(_id);

  if (role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Only super admins can update admin.' });
  }

  try {
    const { id } = req.params;
    const userToUpdate = await User.findById(id);

    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    // Update user properties based on the request body
    userToUpdate.firstname = req.body.firstname || userToUpdate.firstname;
    userToUpdate.lastname = req.body.lastname || userToUpdate.lastname;
    userToUpdate.address = req.body.address || userToUpdate.address;
    userToUpdate.phone = req.body.phone || userToUpdate.phone;
    userToUpdate.status = req.body.status || userToUpdate.status;
    userToUpdate.email = req.body.email || userToUpdate.email;
    userToUpdate.password = req.body.password || userToUpdate.password;

    const updatedUser = await userToUpdate.save();

    return res.json({ success: true, message: 'User updated successfully', updatedUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});



const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;

  try {
    // Find all users and populate machines with filtered user details
    const users = await User.find({});

    // Filter users based on the search term
    const filteredUsers = users
      .filter(user => {
        const firstname = user.firstname?.toLowerCase();
        const lastname = user.lastname?.toLowerCase();
        const email = user.email?.toLowerCase();
        const address = user.address?.toLowerCase();
        const phone = user.phone?.toString(); // Convert phone to string for consistent comparison
        const searchLower = (search || '')?.toLowerCase();
        return (
          firstname?.includes(searchLower) ||
          lastname?.includes(searchLower) ||
          email?.includes(searchLower) ||
          address?.includes(searchLower) ||
          phone?.includes(searchLower)
        );
      });

    if (!filteredUsers || filteredUsers.length === 0) {
      // Return 404 status code for not found
      return res.status(200).json({ success: true, filteredUsers });
    }

    // Apply pagination logic if needed for users
    const paginatedUsers = (page && limit)
      ? filteredUsers.slice((page - 1) * limit, page * limit)
      : filteredUsers;

    // Calculate total pages for users
    const totalUserPages = (limit) ? Math.ceil(filteredUsers.length / limit) : 1;

    return res.json({
      success: true,
      users: paginatedUsers,
      currentPage: parseInt(page) || 1,
      totalUserPages,
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});





const unableAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Toggle the accountStatus field
    user.accountStatus = !user.accountStatus;

    // Save the updated user document
    await user.save();

    // Respond based on the new accountStatus
    const message = user.accountStatus
      ? 'User blocked successfully'
      : 'User unblocked successfully';

    res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//blockes admin
const blockedAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.blocked) {
      return res.status(400).json({ success: false, message: 'User is already blocked' });
    }

    user.blocked = true;
    await user.save();

    res.status(200).json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// unblocked admin

const unblockedAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.blocked) {
      return res.status(400).json({ success: false, message: 'User is not blocked' });
    }

    user.blocked = false;
    await user.save();

    res.status(200).json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


// user add machine
const addMachineToUserLocation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { locationId, employeeIds, machineNumber, serialNumber, gameName } = req.body;

  try {
    const user = await User.findById(userId).populate('location');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const location = user.location.find(loc => loc._id.toString() === locationId);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    // Check if serial number already exists
    const existingMachine = await Machine.findOne({ serialNumber });
    if (existingMachine) {
      return res.status(400).json({ success: false, message: 'Serial number already added' });
    }

    const newMachine = new Machine({ machineNumber, serialNumber,gameName });
    newMachine.employees = employeeIds;

    await newMachine.save();

    location.machines = location.machines || [];
    location.machines.push(newMachine._id);

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

    return res.json({ success: true, message: 'New machine added to location successfully', updatedUser });
  } catch (error) {
    console.error('Add machine to user location error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


// update machine
const updateMachineInUserLocation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { machineId, machineNumber, serialNumber, employeeIds } = req.body;

  try {
    const user = await User.findById(userId).populate('location');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const existingMachine = await Machine.findById(machineId);
    if (!existingMachine) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    // Update machine details if provided in the request
    existingMachine.machineNumber = machineNumber || existingMachine.machineNumber;
    existingMachine.serialNumber = serialNumber || existingMachine.serialNumber;
    existingMachine.employees = employeeIds || existingMachine.employees;

    const updatedMachine = await existingMachine.save();

    const updatedUser = await User.findById(userId)
      .populate({
        path: 'location',
        populate: {
          path: 'machines',
          model: 'Machine'
        }
      })
      .exec();

    return res.json({
      success: true,
      message: 'Machine updated successfully',
      updatedUser,
    });
  } catch (error) {
    console.error('Update machine in user location error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


// update machine active status 
const updateMachineStatus = asyncHandler(async (req, res) => {
  const { machineId } = req.params;
  const { activeMachineStatus } = req.body;

  try {

    // Find and update the machine
    const updatedMachine = await Machine.findByIdAndUpdate(
      machineId,
      { activeMachineStatus },
      { new: true }
    );

    // Check if the machine was found and updated
    if (!updatedMachine) {
      return res.status(404).json({ success: false, message: 'Machine not found', statusCode: 404 });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Machine active status updated successfully',
      machine: updatedMachine,
      statusCode: 200,
    });
  } catch (error) {
    // Handle any errors that occurred during the update
    return res.status(500).json({ success: false, error: error.message, statusCode: 500 });
  }
});



// delete machine
const deleteMachineFromUser = asyncHandler(async (req, res) => {
  const { userId, locationId, machineId } = req.params;

  try {
    const user = await User.findById(userId).populate('location');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', statusCode: 404 });
    }

    const location = user.location.find(loc => loc._id.toString() === locationId);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found for the user', statusCode: 404 });
    }

    const machineIndex = location.machines.findIndex(mach => mach._id.toString() === machineId);
    if (machineIndex === -1) {
      return res.status(404).json({ success: false, message: 'Machine not found in this location', statusCode: 404 });
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

    return res.status(200).json({ success: true, message: 'Machine deleted successfully', updatedUser, statusCode: 200 });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, statusCode: 500 });
  }
});

// get a machines 
const getMachinesOfUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { searchQuery, page, limit } = req.query;

  try {
    const user = await User.findById(userId).populate({
      path: 'location',
      select: 'locationname address percentage machines createdAt updatedAt employees admin activeStatus',
      populate: [
        {
          path: 'machines',
          model: 'Machine',
          populate: {
            path: 'employees',
            model: 'Employee',
            select: 'firstname lastname',
          },
        },
        {
          path: 'employees',
          model: 'Employee',
          select: 'firstname lastname',
        },
        {
          path: 'admin',
          model: 'User',
          select: 'firstname lastname _id',
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        status: 404,
      });
    }

    // Use lean() to get a plain JavaScript object without converting to a Mongoose document
    let locations = await Promise.all(user.location.map(async location => {
      const numofmachines = location.machines.length;
      
      // Include the employee data without calling toObject()
      return { ...location.toObject({ getters: true }), numofmachines };
    }));

    if (searchQuery) {
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      locations = locations.filter(location =>
        location.machines.some(machine =>
          machine.machineNumber.toLowerCase().includes(lowerCaseSearchQuery) ||
          machine.serialNumber.toLowerCase().includes(lowerCaseSearchQuery)
        )
      );
    }

    let paginatedLocations;

    if (page && limit) {
      const totalCount = locations.length;
      const totalPages = Math.ceil(totalCount / limit);
      const currentPage = parseInt(page);

      const skip = (currentPage - 1) * limit;

      paginatedLocations = locations.slice(skip, skip + limit);
      res.json({
        success: true,
        locations: paginatedLocations,
        totalPages,
        currentPage,
      });
    } else {
      res.json({
        success: true,
        locations,
        totalCount: locations.length,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      status: 500,
      error: error.message,
    });
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



// get machine by id
const getMachinebyId = asyncHandler(async (req, res) => {
  try {
    const { machineId, userId } = req.params;

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

// add repair to admin
const addRepairToAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Create a new repair
    const newRepair = new Repair(req.body);

    // Save the new repair
    await newRepair.save();

    // Get the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Add the new repair's ID to the user's repairs array
    user.repairs.push(newRepair._id);

    // Save the updated user
    await user.save();

    return res.status(201).json({ success: true, message: "Repair added to user successfully", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});


// get all repairs
const getAllRepairs = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    // Get the user by ID
    const user = await User.findById(userId).populate("repairs");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Extract repairs from the user object
    const repairs = user.repairs;

    res.status(200).json({ repairs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
})


module.exports = {
  createSuperAdmin,
  createUser, loginUserCtrl, loginAdmin, addRestrictionDate, getAllUsers, getaUser, deleteaUser,
  updatedUser, updateStatusUser, addMachineToUserLocation, updateMachineInUserLocation, updateMachineStatus,
  deleteMachineFromUser, getMachinesOfUser, getMachinebyId, getMachinesByLocationId, unableAdmin, blockedAdmin, unblockedAdmin,
  addRepairToAdmin, getAllRepairs
}
