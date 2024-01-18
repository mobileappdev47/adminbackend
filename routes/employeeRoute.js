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
    getAllMachinesForEmployee
} = require('../controllers/employeeCtrl');

const router = express.Router();


router.get('/allemployee', authMiddleware, isAdmin, getAllUsersEmployees)

router.get('/:userId', authMiddleware, getAllEmployeesForUser)
router.get('/location/:employeeId', employeeMiddleware, getLocationOfEmployee)
router.get('/machine/:employeeId', employeeMiddleware, getAllMachinesForEmployee)

router.post('/register/:userId', authMiddleware, addEmployeeToAdmin);
router.post('/login', loginEmployeeCtrl);
router.get('/:userId/:employeeId', authMiddleware, getEmployeeById)
router.put('/edit-employee/:employeeId', employeeMiddleware, updateEmployee)
router.put('/employeestatus/:userId/:employeeId', authMiddleware, updateStatusOfEmployee)
router.delete('/delete/:userId/:employeeId', authMiddleware, deleteEmployee)

// add new report 
router.get('/employees/:employeeId/repairs', employeeMiddleware, getAllRepairsReport)
router.post('/repair/:employeeId', employeeMiddleware, addNewRepair)

// add new service report
router.get('/service/:employeeId/report', employeeMiddleware, getAllServiceReports)
router.post('/servicereport/:employeeId', employeeMiddleware, addServiceReport)


router.post('/collection/:employeeId', employeeMiddleware, addCollectionReport)


module.exports = router;    