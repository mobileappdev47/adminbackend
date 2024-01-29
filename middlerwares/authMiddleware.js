const User = require('../models/userModel')
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Employee = require('../models/employeModel');

const authMiddleware = asyncHandler(async (req, res, next)=> {
    let token;
    if(req?.headers?.authorization?.startsWith('Bearer')){
        token = req.headers.authorization.split(" ")[1];
        try {
            if(token){
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const admin = await User.findById(decoded?.id);
                req.admin = admin;
                next();
            }
        } catch (error) {
            throw new Error("Not Authorized token Expired, Please login again")
        }
    }
    else{
        throw new Error("There is no token atteched to header")
    }
});

const employeeMiddleware = asyncHandler(async (req, res, next)=> {
    let token;
    if(req?.headers?.authorization?.startsWith('Bearer')){
        token = req.headers.authorization.split(" ")[1];
        try {
            if(token){
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const employee = await Employee.findById(decoded?.id);
                req.employee = employee;
                next();
            }
        } catch (error) {
            throw new Error("Not Authorized token Expired, Please login again")
        }
    }
    else{
        throw new Error("There is no token atteched to header")
    }
});

const isAdmin = asyncHandler(async(req, res, next) =>{
    let  {email} = req.admin;
    const userAdmin = await User.findOne({email});
    if(userAdmin.role !== "superadmin" ){
        throw new Error("You are not an super admin");
    }
    else{
        next();
    }
})



module.exports = {authMiddleware, isAdmin, employeeMiddleware} ;