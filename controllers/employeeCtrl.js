const genrateToken = require("../config/jwtToken");
const genrateRefreshToken = require("../config/refreshToken");
const Employee = require("../models/employeModel");
const asyncHandler = require("express-async-handler");
const validateMongodbId = require("../utils/validateMongodbid");
const User = require('../models/userModel')



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

    const newEmployee = new Employee({
      firstname,
      lastname,
      phone,
      email,
      address,
      password
    });

    await newEmployee.save();

    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { employees: newEmployee._id } },
      { new: true }
    );

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
  const { searchEmployee, page, limit } = req.query;

  try {
    const user = await User.findById(userId).populate({
      path: 'employees',
      options: {
        skip: parseInt(page - 1) * parseInt(limit),
        limit: parseInt(limit),
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', statusCode: 404 });
    }

    let employees = user.employees;

    if (searchEmployee) {
      employees = employees.filter(employee =>
        employee.firstname.toLowerCase().includes(searchEmployee.toLowerCase())
      );
    }

    res.status(200).json({
      success: true,
      employees,
      currentPage: parseInt(page),
      limit: parseInt(limit),
      totalCount: user.employees.length, 
      statusCode: 200,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, statusCode: 500 });
  }
});




module.exports = { addEmployeeToAdmin, loginEmployeeCtrl, getEmployeeById, updateEmployee, deleteEmployee, getAllEmployeesForUser, updateStatusOfEmployee }