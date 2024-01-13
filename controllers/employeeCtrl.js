const genrateToken = require("../config/jwtToken");
const genrateRefreshToken = require("../config/refreshToken");
const Employee = require("../models/employeModel");
const asyncHandler = require("express-async-handler");
const validateMongodbId = require("../utils/validateMongodbid");
const User = require('../models/userModel')


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
      password
    } = req.body;

    // Create the employee object and save it to the database
    const newEmployee = new Employee({
      firstname,
      lastname,
      phone,
      email,
      address,
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
        data: {
          _id: findEmployee?._id,
          firstname: findEmployee?.firstname,
          lastname: findEmployee?.lastname,
          phone: findEmployee?.phone,
          email: findEmployee?.email,
          token: genrateToken(findEmployee?._id),
        },
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
  const { userId, employeeId } = req.params;

  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      {
        $set: {
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          address: req.body.address,
          email: req.body.email,
          phone: req.body.phone,
          password: req.body.password
        }
      },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ success: false, message: 'Employee not found', statusCode: 404 });
    }

    const user = await User.findOne({ _id: userId, employees: employeeId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee does not belong to the user', statusCode: 404 });
    }

    res.status(200).json({ success: true, message: 'Employee details updated successfully', employee: updatedEmployee, statusCode: 200 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, statusCode: 500 });
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






module.exports = { addEmployeeToAdmin, loginEmployeeCtrl, getEmployeeById, updateEmployee, deleteEmployee, getAllEmployeesForUser, updateStatusOfEmployee, getAllUsersEmployees }