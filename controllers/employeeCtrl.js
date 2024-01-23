const genrateToken = require("../config/jwtToken");
const genrateRefreshToken = require("../config/refreshToken");
const Employee = require("../models/employeModel");
const asyncHandler = require("express-async-handler");
const validateMongodbId = require("../utils/validateMongodbid");
const User = require('../models/userModel')
const Location = require('../models/locationModel')
const Repair = require('../models/repairModel')
const ServiceReport = require('../models/serviceReportModel')
const CollectionReport = require('../models/collectionModel')
const Machine = require('../models/machineModel')
const mongoose = require('mongoose')

// add employee to admin
const addEmployeeToAdmin = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      firstname,
      lastname,
      phone,
      email,
      address,
      password,
      image
    } = req.body;

    // Check if the email already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'Email is already exits!' });
    }

    // Create the employee object and save it to the database
    const newEmployee = new Employee({
      firstname,
      lastname,
      phone,
      email,
      address,
      image,
      password
    });

    // Save the new employee to the database
    await newEmployee.save();

    // Add the employee's ID to the user's employees array
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { employees: newEmployee._id } },
      { new: true }
    );

    // Now you can send the response after saving the employee
    res.status(201).json({
      success: true,
      message: 'Employee created and added to the user',
      data: user, // Use 'data' key to send user details
      statusCode: 201 // Custom status code for success
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to add employee to the user',
      error: err.message,
      statusCode: 500 // Custom status code for server error
    });
  }
});


// login employee
const loginEmployeeCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findEmployee = await Employee.findOne({ email });

  if (findEmployee) {
    if (await findEmployee.isPasswordMatched(password)) {
      const refreshToken = genrateRefreshToken(findEmployee?._id);
      const updateEmployee = await Employee.findByIdAndUpdate(
        findEmployee.id,
        { refreshToken: refreshToken },
        { new: true }
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        _id: findEmployee?._id,
        firstname: findEmployee?.firstname,
        lastname: findEmployee?.lastname,
        phone: findEmployee?.phone,
        email: findEmployee?.email,
        image: findEmployee?.image,
        token: genrateToken(findEmployee?._id),
        statusCode: 200, // Custom status code for successful login
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid Credentials",
        statusCode: 401, // Custom status code for unauthorized access
      });
    }
  } else {
    res.status(404).json({
      success: false,
      message: "Employee not found",
      statusCode: 404, // Custom status code for resource not found
    });
  }
});


// get Employee by id
const getEmployeeById = asyncHandler(async (req, res) => {
  try {
    const { employeeId, userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', statusCode: 404 });
    }

    const employee = await Employee.findOne({ _id: employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found', statusCode: 404 });
    }

    if (!user.employees.includes(employeeId)) {
      return res.status(403).json({ success: false, message: 'Employee does not belong to the user', statusCode: 403 });
    }

    res.status(200).json({ success: true, employee, statusCode: 200 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, statusCode: 500 });
  }
});


// update employee
const updateEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  try {
    let updateFields = {
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      address: req.body.address,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
    };

    // Check if there is a new image URL in the request
    if (req.body.image) {
      updateFields.image = req.body.image;
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedEmployee) {
      return res
        .status(404)
        .json({ success: false, message: 'Employee not found', statusCode: 404 });
    }

    // Extract only the updated fields from the updatedEmployee object
    const updatedFields = Object.keys(updateFields).reduce((acc, key) => {
      if (updatedEmployee[key] !== undefined) {
        acc[key] = updatedEmployee[key];
      }
      return acc;
    }, {});

    res
      .status(200)
      .json({
        success: true,
        message: 'Employee details updated successfully',
        updatedFields: updatedFields,
        statusCode: 200,
      });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: error.message, statusCode: 500 });
  }
});




// update employee status
const updateStatusOfEmployee = asyncHandler(async (req, res) => {
  const { userId, employeeId } = req.params;
  const { activeEmployeeStatus } = req.body;

  try {
    // Find the employee by ID
    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $set: { activeEmployeeStatus } },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ success: false, message: 'Employee not found', statusCode: 404 });
    }

    const user = await User.findOne({ _id: userId, employees: employeeId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee does not belong to the user', statusCode: 404 });
    }

    res.status(200).json({ success: true, message: 'Employee status updated successfully', employee: updatedEmployee, statusCode: 200 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, statusCode: 500 });
  }
});


// delete a employee
const deleteEmployee = asyncHandler(async (req, res) => {
  const { userId, employeeId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', statusCode: 404 });
    }

    const isValidEmployeeId = user.employees.some(id => id.toString() === employeeId);
    if (!isValidEmployeeId) {
      return res.status(404).json({ success: false, message: 'Employee not found for this user', statusCode: 404 });
    }

    user.employees = user.employees.filter(id => id.toString() !== employeeId);
    await user.save();

    res.status(200).json({ success: true, message: 'Employee deleted successfully', user, statusCode: 200 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, statusCode: 500 });
  }
});


// search and all Employee
const getAllEmployeesForUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page, limit, searchEmployee } = req.query;

  try {
    let query = {};

    if (searchEmployee) {
      // Add a case-insensitive search for employee firstname
      query = { firstname: { $regex: new RegExp(searchEmployee, 'i') } };
    }

    const user = await User.findById(userId).populate({
      path: "employees",
      match: query,  // Apply the search query to filter employees
      options: {
        limit: page ? parseInt(page) : undefined,
        skip: page ? (parseInt(page) - 1) * (limit ? parseInt(limit) : 10) : undefined,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found", statusCode: 404 });
    }

    const employees = user.employees;
    const totalCount = await Employee.countDocuments({ _id: { $in: employees }, ...query });

    res.json({
      success: true,
      message: "Employees retrieved successfully",
      employees,
      totalCount,
      currentPage: page ? parseInt(page) : undefined,
      totalPages: page ? Math.ceil(totalCount / (limit ? parseInt(limit) : 10)) : undefined,
      pageSize: limit ? parseInt(limit) : undefined,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error", statusCode: 500 });
  }
});


// get all users employee
const getAllUsersEmployees = asyncHandler(async (req, res) => {
  const { searchEmployee, page, limit } = req.query;

  try {
    // Check if req.admin exists
    if (!req.admin) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied. You are not authorized to access this data.',
        statusCode: 403,
      });
    }

    // Retrieve all users and populate the 'employees' field
    const users = await User.find({}).populate('employees');

    // Collect all employees from all users
    let allEmployees = [];

    // Loop through each user to collect their employees
    for (const user of users) {
      allEmployees = allEmployees.concat(user.employees);
    }

    // Apply search filter if provided
    let filteredEmployees = allEmployees;
    if (searchEmployee) {
      filteredEmployees = allEmployees.filter(employee =>
        employee.firstname.toLowerCase().includes(searchEmployee.toLowerCase())
      );
    }

    // Pagination
    let paginatedEmployees = filteredEmployees;
    let totalPages = 1;

    if (page && limit) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);
      totalPages = Math.ceil(filteredEmployees.length / parseInt(limit));
    }

    res.status(200).json({
      success: true,
      employees: paginatedEmployees,
      currentPage: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : filteredEmployees.length,
      totalPages,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message, statusCode: 500 });
  }
});


// employee assign for locations
const getLocationOfEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { page, limit, searchLocation } = req.query;

  try {
    // Find the employee by ID
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Get all locations of the employee with admin details
    let locationQuery = { employees: employeeId };

    // If searchLocation is provided, add it to the query
    if (searchLocation) {
      locationQuery.locationname = { $regex: new RegExp(searchLocation, 'i') };
    }

    const locations = await Location.find(locationQuery)
      .populate({
        path: 'admin',
        model: 'User',
        select: 'firstname lastname _id',
      })
      .populate({
        path: 'machines',
        model: 'Machine',
        select: '_id',
      })
      .populate({
        path: 'employees',
        model: 'Employee',
        select: 'firstname lastname',
      });

    if (!locations || locations.length === 0) {
      return res.status(200).json({ success: true, locations });
    }

    // Update the numofmachines for each location
    const updatedLocations = await Promise.all(locations.map(async location => {
      const numofmachines = location.machines.length;
      location.numofmachines = numofmachines;
      await location.save();
      return location.toObject();
    }));

    // If page and limit are provided, paginate the result
    if (page && limit) {
      const totalCount = updatedLocations.length;
      const totalPages = Math.ceil(totalCount / limit);
      const currentPage = parseInt(page);

      const skip = (currentPage - 1) * limit;
      const paginatedLocations = updatedLocations.slice(skip, skip + limit);

      return res.json({ success: true, locations: paginatedLocations, totalPages, currentPage });
    }

    // If page and limit are not provided, return all locations without pagination
    return res.json({ success: true, locations: updatedLocations });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


// employee assign for machine
const getAllMachinesForEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { page, limit, search } = req.query;

  try {
    // Find all locations where the employee is assigned and populate machines with filtered employee details
    const locations = await Location.find({ employees: employeeId })
      .populate({
        path: 'machines',
        populate: [
          {
            path: 'employees',
            match: { _id: employeeId },
            model: 'Employee',
            select: 'firstname lastname _id',
          },
        ],
      })
      .exec();

    // Filter locations based on the search term
    const filteredLocations = locations
      .filter(location => {
        const locationname = location.locationname.toLowerCase();
        const searchLower = (search || '').toLowerCase();
        return locationname.includes(searchLower) ||
          location.machines.some(machine => {
            const machineNumber = machine.machineNumber.toLowerCase();
            const serialNumber = machine.serialNumber.toLowerCase();
            return machineNumber.includes(searchLower) || serialNumber.includes(searchLower);
          });
      })
      .map(location => {
        // Filter machines to include only those with at least one employee matching the condition
        const filteredMachines = location.machines.filter(machine => machine.employees.length > 0);
        return { ...location.toObject(), machines: filteredMachines };
      });

    if (!filteredLocations || filteredLocations.length === 0) {
      // Return 404 status code for not found
      return res.status(200).json({ success: true, filteredLocations });
    }

    // Apply pagination logic if needed for locations
    const paginatedLocations = (page && limit)
      ? filteredLocations.slice((page - 1) * limit, page * limit)
      : filteredLocations;

    // Calculate total pages for locations
    const totalLocationPages = (limit) ? Math.ceil(filteredLocations.length / limit) : 1;

    return res.json({
      success: true,
      locations: paginatedLocations,
      currentPage: parseInt(page) || 1,
      totalLocationPages,
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


// add new repair
const addNewRepair = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const {
    machineNumber,
    serialNumber,
    auditNumber,
    date,
    time,
    reporterName,
    issue,
    image,
    location
  } = req.body;

  try {
    // Validate if location is a valid ObjectId
    if (location && !mongoose.Types.ObjectId.isValid(location)) {
      return res.status(400).json({ success: false, message: 'Invalid location ID' });
    }

    // Find the employee by ID
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // If location is provided, check if it exists
    let locationDocument;
    if (location) {
      locationDocument = await Location.findById(location);
      if (!locationDocument) {
        return res.status(404).json({ success: false, message: 'Location not found' });
      }
    }

    // Create a new repair report with the location ID
    const newRepairs = new Repair({
      location: locationDocument ? locationDocument._id : undefined,
      machineNumber,
      serialNumber,
      auditNumber,
      date,
      time,
      reporterName,
      issue,
      image,
    });

    // Save the repair report
    await newRepairs.save();

    // Update the employee with the new repair report
    employee.newRepairs.push(newRepairs._id);
    await employee.save();

    return res.status(201).json({
      success: true,
      message: 'New repair report created for the employee',
      newRepairs,
    });
  } catch (error) {
    console.error('Error creating new repair report:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


// get repairs report of employee
const getAllRepairsReport = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { page, limit, searchRepair } = req.query;

  try {
    // Find the employee by ID and populate the 'newRepairs' field
    const employee = await Employee.findById(employeeId).populate({
      path: 'newRepairs',
      populate: {
        path: 'location',
        model: 'Location',
        select: 'locationname _id',
      },
    }).exec();

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Map the repair reports and include the location field
    const repairReports = employee.newRepairs.map(report => ({
      ...report.toObject({ getters: true }),
      location: report.location ? report.location.locationname : null,
    }));

    // Apply search filter if searchLocation is provided
    let filteredRepairReports = repairReports;
    if (searchRepair) {
      const searchRegex = new RegExp(searchRepair, 'i');
      filteredRepairReports = repairReports.filter(report =>
        report.location && report.location.match(searchRegex)
      );
    }

    if (!filteredRepairReports || filteredRepairReports.length === 0) {
      // Return 404 status code for not found
      return res.status(200).json({ success: true, filteredRepairReports });
    }

    // Initialize total pages
    let totalPages;

    // Apply pagination logic if needed
    let paginatedRepairReports;
    if (page && limit) {
      const totalCount = filteredRepairReports.length;
      totalPages = Math.ceil(totalCount / limit);
      const currentPage = parseInt(page);

      const skip = (currentPage - 1) * limit;
      paginatedRepairReports = filteredRepairReports.slice(skip, skip + limit);
    } else {
      // If page and limit are not provided, return all repair reports
      paginatedRepairReports = filteredRepairReports;
    }

    return res.status(200).json({
      success: true,
      message: 'Repair reports retrieved successfully',
      repairReports: paginatedRepairReports,
      totalPages,
      currentPage: parseInt(page) || 1,
    });
  } catch (error) {
    console.error('Error retrieving repair reports:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


// add service report 
const addServiceReport = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const {
    machineNumber,
    serialNumber,
    auditNumber,
    date,
    time,
    employeeName,
    serviceRequested,
    image,
  } = req.body;

  try {
    // Find the employee by ID
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Create a new service report
    const newServiceReports = new ServiceReport({
      machineNumber,
      serialNumber,
      auditNumber,
      date,
      time,
      employeeName,
      serviceRequested,
      image,
    });

    // Save the service report
    await newServiceReports.save();

    // Update the employee with the new service report
    employee.newServiceReports.push(newServiceReports._id);
    await employee.save();

    return res.status(201).json({
      success: true,
      message: 'New service report created for the employee',
      employee,
      newServiceReports,
    });
  } catch (error) {
    console.error('Error creating new service report:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


// get all service report 
const getAllServiceReports = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { page, limit, searchService } = req.query;

  try {
    // Find the employee by ID and populate the 'newServiceReports' field along with 'machine'
    const employee = await Employee.findById(employeeId).populate({
      path: 'newServiceReports',
    }).exec();

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    let serviceReports = employee.newServiceReports;

    // If searchQuery is provided, filter by either machine number or serial number
    if (searchService) {
      serviceReports = serviceReports.filter(report =>
        report.machineNumber.toLowerCase().includes(searchService.toLowerCase()) ||
        report.serialNumber.toLowerCase().includes(searchService.toLowerCase())
      );
    }

    // Check if any service reports are found after filtering
    if (!serviceReports || serviceReports.length === 0) {
      // Return 404 status code for not found
      return res.status(200).json({ success: true, serviceReports });
    }

    // If page and limit are provided, paginate the result
    if (page && limit) {
      const totalCount = serviceReports.length;
      const totalPages = Math.ceil(totalCount / limit);
      const currentPage = parseInt(page);

      const skip = (currentPage - 1) * limit;

      serviceReports = serviceReports.slice(skip, skip + limit);

      return res.status(200).json({
        success: true,
        message: 'Service reports retrieved successfully',
        serviceReports,
        totalPages,
        currentPage,
      });
    }

    // If page and limit are not provided, return all service reports without pagination
    return res.status(200).json({
      success: true,
      message: 'Service reports retrieved successfully',
      serviceReports,
    });
  } catch (error) {
    console.error('Error retrieving service reports:', error);
    // Return 500 status code for internal server error with the error message
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});




// add collection report
const addCollectionReport = asyncHandler(async (req, res) => {
  const { employeeId, locationId } = req.params; // Extract locationId from params
  const {
    machineNumber,
    serialNumber,
    auditNumber,
    inNumbers: { previous: inPrevious, current: inCurrent },
    outNumbers: { previous: outPrevious, current: outCurrent },
    total,
    image,
  } = req.body;

  try {
    // Find the employee by ID
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Create a new collection report
    const newCollectionReport = new CollectionReport({
      location: locationId, // set the location ID
      machineNumber,
      serialNumber,
      auditNumber,
      inNumbers: { previous: inPrevious, current: inCurrent },
      outNumbers: { previous: outPrevious, current: outCurrent },
      total,
      image,
    });

    // Save the collection report
    await newCollectionReport.save();

    // Update the employee with the new collection report
    employee.newCollectionReports.push(newCollectionReport._id);
    await employee.save();

    // Update the statusOfPayment in the associated location to true
    const locationToUpdate = await Location.findOneAndUpdate(
      { _id: locationId }, // use the location ID from params
      { $set: { statusOfPayment: true } },
      { new: true }
    );

    if (!locationToUpdate) {
      console.error('Location not found for the given ID:', locationId);
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    return res.status(201).json({
      success: true,
      message: 'New collection report created for the employee',
      data: { employee, newCollectionReport, updatedLocation: locationToUpdate },
    });
  } catch (error) {
    console.error('Error creating new collection report:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


// get all collection report 
const getAllCollectionReport = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { page, limit, searchLocation } = req.query;

  try {
    // Find the employee by ID and populate the 'newCollectionReports' field with 'location'
    const employee = await Employee.findById(employeeId)
      .select('firstname lastname')
      .populate({
        path: 'newCollectionReports',
        populate: {
          path: 'location',
          model: 'Location',
          select: 'locationname _id address numofmachines createdAt',
        },
      })
      .exec();

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    let collectionReports = employee.newCollectionReports;

    // If searchLocation is provided, filter by locationname
    if (searchLocation) {
      const searchRegex = new RegExp(searchLocation, 'i');
      collectionReports = collectionReports.filter(report =>
        report.location && report.location.locationname.match(searchRegex)
      );
    }

    // Group reports by location ID
    const groupedReports = {};
    collectionReports.forEach(report => {
      const locationId = report.location._id.toString();
      if (!groupedReports[locationId]) {
        groupedReports[locationId] = {
          location: report.location,
          employee: { firstname: employee.firstname, lastname: employee.lastname },
          collectionReports: [],
        };
      }
      groupedReports[locationId].collectionReports.push(report);
    });

    // If page and limit are provided, paginate the result
    if (page && limit) {
      const totalCount = Object.keys(groupedReports).length;
      const totalPages = Math.ceil(totalCount / limit);
      const currentPage = parseInt(page);

      const skip = (currentPage - 1) * limit;
      const paginatedGroupedReports = Object.values(groupedReports).slice(skip, skip + limit);

      // Adjust the response structure to nest collectionReports under location
      const adjustedResponse = paginatedGroupedReports.map(groupedReport => ({
        location: groupedReport.location,
        employee: groupedReport.employee,
        collectionReports: groupedReport.collectionReports,
      }));

      return res.status(200).json({
        success: true,
        message: 'Collection reports retrieved successfully',
        groupedReports: adjustedResponse,
        totalPages,
        currentPage,
      });
    }

    // If page and limit are not provided, return all collection reports without pagination
    const adjustedResponse = Object.values(groupedReports).map(groupedReport => ({
      location: groupedReport.location,
      employee: groupedReport.employee,
      collectionReports: groupedReport.collectionReports,
    }));

    return res.status(200).json({
      success: true,
      message: 'Collection reports retrieved successfully',
      groupedReports: adjustedResponse,
    });
  } catch (error) {
    console.error('Error retrieving collection reports:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


// recent collection
const getRecentCollectionReport = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  try {
    // Find the employee by ID and retrieve the last three collection reports
    const employee = await Employee.findById(employeeId)
      .populate({
        path: 'newCollectionReports',
        options: { limit: 3, sort: { _id: -1 } },
        populate: {
          path: 'location',
          model: 'Location',
          select: 'locationname _id address numofmachines createdAt',
        },
      })
      .exec();

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Extract the last three collection reports
    const lastThreeCollectionReports = employee.newCollectionReports;

    // Group the last three collection reports by location ID
    const groupedReports = {};
    lastThreeCollectionReports.forEach(report => {
      const locationId = report.location._id.toString();
      if (!groupedReports[locationId]) {
        groupedReports[locationId] = {
          location: report.location,
          employee: { firstname: employee.firstname, lastname: employee.lastname },
          collectionReports: [],
        };
      }
      groupedReports[locationId].collectionReports.push(report);
    });

    // Adjust the response structure to nest collectionReports under location
    const adjustedResponse = Object.values(groupedReports).map(groupedReport => ({
      location: groupedReport.location,
      employee: groupedReport.employee,
      collectionReports: groupedReport.collectionReports,
    }));

    return res.status(200).json({
      success: true,
      message: 'Last three collection reports retrieved successfully',
      groupedReports: adjustedResponse,
    });
  } catch (error) {
    console.error('Error retrieving last three collection reports:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});




// last collection 
const lastCollectionReport = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  try {
    // Find the employee by ID and populate the 'newCollectionReports' field
    const employee = await Employee.findById(employeeId)
      .populate({
        path: 'newCollectionReports',
        options: { sort: { _id: -1 }, limit: 1 }, // Sort by createdAt in descending order, limit to 1
        populate: {
          path: 'location',
          model: 'Location',
          select: 'locationname _id address numofmachines createdAt',
        },
      })
      .exec();

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Retrieve the first (and only) item in the array (last collection report)
    const lastCollectionReport = employee.newCollectionReports[0];

    // Adjust the response structure to include location details
    const lastCollection = lastCollectionReport
      ? {
          location: lastCollectionReport.location,
          employee: { firstname: employee.firstname, lastname: employee.lastname },
          lastCollectionReport: lastCollectionReport,
        }
      : null;

    return res.status(200).json({
      success: true,
      message: 'Last collection report retrieved successfully',
      lastCollection,
    });
  } catch (error) {
    console.error('Error retrieving last collection report:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});



module.exports = {
  addEmployeeToAdmin, loginEmployeeCtrl, getEmployeeById, updateEmployee,
  deleteEmployee, getAllEmployeesForUser, updateStatusOfEmployee, getAllUsersEmployees, getLocationOfEmployee, getAllMachinesForEmployee,
  addNewRepair, getAllRepairsReport, getAllServiceReports, addServiceReport, addCollectionReport, getAllCollectionReport, getRecentCollectionReport,
  lastCollectionReport
}