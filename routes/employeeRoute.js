const express = require('express');

const { employeeMiddleware, isAdmin, authMiddleware } = require('../middlerwares/authMiddleware');
const { addEmployeeToAdmin, loginEmployeeCtrl, getEmployeeById,
    updateEmployee, deleteEmployee, getAllEmployeesForUser, updateStatusOfEmployee,
    getAllUsersEmployees,
    getLocationOfEmployee,
    addNewRepair,
    addServiceReport,
    addCollectionReport,
    getAllRepairsReport,
    getAllServiceReports,
    getAllMachinesForEmployee,
    getAllCollectionReport,
    getRecentCollectionReport,
    lastCollectionReport,
    getLastTwoPendingRepairs,
    changeStatusOfRepairs,
    sendOtp,
    verifyOtp,
    updatePassword
} = require('../controllers/employeeCtrl');

const router = express.Router();


router.get('/allemployee', authMiddleware, isAdmin, getAllUsersEmployees)

router.get('/:userId', authMiddleware, getAllEmployeesForUser)
router.get('/location/:employeeId', employeeMiddleware, getLocationOfEmployee)
router.get('/machine/:employeeId', employeeMiddleware, getAllMachinesForEmployee);
router.post('/register/:userId', authMiddleware, addEmployeeToAdmin);
router.post('/login', loginEmployeeCtrl);
router.get('/:userId/:employeeId', authMiddleware, getEmployeeById)
router.put('/edit-employee/:employeeId', employeeMiddleware, updateEmployee)
router.put('/employeestatus/:userId/:employeeId', authMiddleware, updateStatusOfEmployee)
router.delete('/delete/:userId/:employeeId', authMiddleware, deleteEmployee)

router.post('/forgot-password', sendOtp)
router.post('/verify-otp/:employeeId', verifyOtp)
router.put('/reset-password/:employeeId', updatePassword)

// add new report 
router.get('/employees/:employeeId/repairs', employeeMiddleware, getAllRepairsReport)
router.get('/pending/:employeeId/repairs', employeeMiddleware, getLastTwoPendingRepairs)
router.put('/repair/:locationId/:machineId/:employeeId', employeeMiddleware, addNewRepair)
router.post('/changestatus/:repairId', employeeMiddleware, changeStatusOfRepairs)


// add new service report
router.get('/service/:employeeId/report', employeeMiddleware, getAllServiceReports)
router.post('/servicereport/:employeeId', employeeMiddleware, addServiceReport)

// add new collection report
router.get('/collection/:employeeId/report', employeeMiddleware, getAllCollectionReport)
router.get('/recent-collection/:employeeId/report', employeeMiddleware, getRecentCollectionReport)
router.get('/last-collection/:employeeId/report', employeeMiddleware, lastCollectionReport)
router.post('/collection/:employeeId/:locationId', employeeMiddleware, addCollectionReport)


module.exports = router;    