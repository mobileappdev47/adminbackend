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
const Repair = require('../models/repairModel');
const CollectionReport = require('../models/collectionModel')

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
  // validateMongodbId(id);

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
  const { locationId, employeeIds, machineNumber, serialNumber, gameName, initialnumber } = req.body;

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

    const newMachine = new Machine({ machineNumber, serialNumber,gameName, initialnumber });
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
  const { machineId, machineNumber, serialNumber, employeeIds, gameName, initialnumber, currentNumber } = req.body;

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
    existingMachine.initialnumber = initialnumber || existingMachine.initialnumber;
    existingMachine.currentNumber = currentNumber || existingMachine.currentNumber;
    existingMachine.gameName = gameName || existingMachine.gameName;
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


// total collection report
const getTotalCollectionReportsForUserEmployees = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user based on userId
    const user = await User.findById(userId).populate('employees');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Extract employee IDs from the user's employees
    const employeeIds = user.employees.map(employee => employee._id);

    // Find all collection reports for all employees associated with the user
    const allCollectionReports = await CollectionReport
      .find({ employee: { $in: employeeIds } })
      .populate({
        path: 'machines',
        model: 'Machine', // Adjust the model name as per your schema
      });

    // Initialize an array to store the total profit for each month, with zero values for all months
    const monthlyTotals = Array.from({ length: 12 }, () => 0);

    // Iterate through each collection report
    allCollectionReports.forEach(report => {
      // Extract the month from the updatedAt field of the report
      const month = report.updatedAt.getMonth(); // Assuming updatedAt is a date field

      // Iterate through each machine in the report and add its total to the corresponding month's total
      report.machines.forEach(machine => {
        // Convert the total to a number before adding it to the monthly total
        const total = parseFloat(machine.total);
        if (!isNaN(total)) {
          monthlyTotals[month] += total;
        }
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Total collection reports for user employees retrieved successfully',
      monthlyTotals: monthlyTotals,
    });
  } catch (error) {
    console.error('Error fetching total collection reports for user employees:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


const getTotalCollectionReportsAdminForUserEmployees = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user based on userId
    const user = await User.findById(userId).populate('employees');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Extract employee IDs from the user's employees
    const employeeIds = user.employees.map(employee => employee._id);

    // Find all collection reports for all employees associated with the user
    const allCollectionReports = await CollectionReport
      .find({ employee: { $in: employeeIds } })
      .populate({
        path: 'machines',
        model: 'Machine', // Adjust the model name as per your schema
      })
      .populate({
        path: 'location',
        model: 'Location', // Adjust the model name as per your schema
      })
      .populate({
        path: 'employee',
        model: 'Employee', // Adjust the model name as per your schema
      });

      console.log(allCollectionReports, 'allCollectionReports');

    return res.status(200).json({
      success: true,
      message: 'Total collection reports for user employees retrieved successfully',
      allCollectionReports: allCollectionReports,
    });
  } catch (error) {
    console.error('Error fetching total collection reports for user employees:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


const getTotalInNumbersForUserEmployees = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user based on userId
    const user = await User.findById(userId).populate('employees');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Extract employee IDs from the user's employees
    const employeeIds = user.employees.map(employee => employee._id);

    // Find all collection reports for all employees associated with the user
    const allCollectionReports = await CollectionReport
      .find({ employee: { $in: employeeIds } })
      .populate({
        path: 'machines',
        model: 'Machine', // Adjust the model name as per your schema
      });

    // Initialize variables to store the total inNumber and outNumber differences for the full year
    let totalInNumberDifference = 0;
    let totalOutNumberDifference = 0;

    // Iterate through each collection report
    allCollectionReports.forEach(report => {
      // Iterate through each machine in the report
      report.machines.forEach(machine => {
        // Subtract previous inNumber from current inNumber and previous outNumber from current outNumber
        const inNumberDifference = machine.inNumbers.previous - machine.inNumbers.current ;
        const outNumberDifference = machine.outNumbers.previous - machine.outNumbers.current;
        
        // Add the differences to the total
        totalInNumberDifference += inNumberDifference;
        totalOutNumberDifference += outNumberDifference;
      });
    });

    // Calculate profit
    const profit = totalOutNumberDifference - totalInNumberDifference;

    return res.status(200).json({
      success: true,
      message: 'Total inNumber and outNumber differences for user employees retrieved successfully',
      totalInNumberDifference: totalInNumberDifference,
      totalOutNumberDifference: totalOutNumberDifference,
      profit: profit
    });
  } catch (error) {
    console.error('Error fetching total inNumber and outNumber differences for user employees:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});




// recent collection report
const getRecentCollectionReportsForUserEmployees = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user based on userId
    const user = await User.findById(userId).populate('employees');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Extract employee IDs from the user's employees
    const employeeIds = user.employees.map(employee => employee._id);

    // Find the recent collection reports for all employees associated with the user
    const recentCollectionReports = await CollectionReport
      .find({ employee: { $in: employeeIds } })
      .sort({ updatedAt: -1 })
      .populate({
        path: 'machines',
        model: 'Machine', // Adjust the model name as per your schema
      })
      .populate({
        path: 'location',
        model: 'Location', // Adjust the model name as per your schema
        select: '_id locationname address numofmachines'
      });

    if (recentCollectionReports.length === 0) {
      // Return an empty array if no collection reports are found
      return res.status(200).json({
        success: true,
        message: 'No collection reports found for the employees associated with the user',
        data: [], // Empty array
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Recent collection reports for user employees retrieved successfully',
      data: recentCollectionReports,
    });
  } catch (error) {
    console.error('Error fetching recent collection reports for user employees:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});



// pending repairs 
const getLastTwoPendingRepairsAllEmployees = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user based on userId
    const user = await User.findById(userId).populate('employees');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Extract employee IDs from the user's employees
    const employeeIds = user.employees.map(employee => employee._id);

    // Find the last two pending repair reports for all employees associated with the user
    const lastTwoPendingRepairs = await Repair.find({ employee: { $in: employeeIds }, machines: { $ne: [] } })
      .sort({ _id: -1 })
      .limit(2)
      .populate({
        path: 'machines',
        model: 'Machine',
      })
      .populate({
        path: 'location',
        model: 'Location',
        select: '_id locationname numofmachines'
      });

    if (lastTwoPendingRepairs.length === 0) {
      // Return an empty array if no pending repair reports are found
      return res.status(200).json({
        success: true,
        message: 'No pending repair reports found for the employees associated with the user',
        data: [], // Empty array
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Last two pending repair reports retrieved successfully for the employees associated with the user',
      data: lastTwoPendingRepairs,
    });
  } catch (error) {
    console.error('Error retrieving last two pending repair reports:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});



const getAllRepairsAllEmployees = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user based on userId
    const user = await User.findById(userId).populate('employees');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Extract employee IDs from the user's employees
    const employeeIds = user.employees.map(employee => employee._id);

    // Find all pending repair reports for all employees associated with the user
    const allRepairs = await Repair.find({ employee: { $in: employeeIds }, machines: { $ne: [] } })
      .sort({ _id: -1 })
      .populate({
        path: 'machines',
        model: 'Machine',
      })
      .populate({
        path: 'location',
        model: 'Location',
        select: '_id locationname numofmachines'
      });

    if (allRepairs.length === 0) {
      // Return an empty array if no repair reports are found
      return res.status(200).json({
        success: true,
        message: 'No repair reports found for the employees associated with the user',
        data: [], // Empty array
      });
    }

    return res.status(200).json({
      success: true,
      message: 'All repair reports retrieved successfully for the employees associated with the user',
      data: allRepairs,
    });
  } catch (error) {
    console.error('Error retrieving all repair reports:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});




module.exports = {
  createSuperAdmin,
  createUser, loginUserCtrl, loginAdmin, addRestrictionDate, getAllUsers, getaUser, deleteaUser,
  updatedUser, updateStatusUser, addMachineToUserLocation, updateMachineInUserLocation, updateMachineStatus,
  deleteMachineFromUser, getMachinesOfUser, getMachinebyId, getMachinesByLocationId, unableAdmin, blockedAdmin, unblockedAdmin,
  getLastTwoPendingRepairsAllEmployees,getTotalCollectionReportsForUserEmployees, getTotalCollectionReportsAdminForUserEmployees, getTotalInNumbersForUserEmployees, getRecentCollectionReportsForUserEmployees,
  getAllRepairsAllEmployees
}
