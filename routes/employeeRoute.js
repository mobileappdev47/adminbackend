const express = require('express');

const { employeeMiddleware, isAdmin, authMiddleware } = require('../middlerwares/authMiddleware');
const { addEmployeeToAdmin, loginEmployeeCtrl, getEmployeeById,
    updateEmployee, deleteEmployee, getAllEmployeesForUser, updateStatusOfEmployee,
    getAllUsersEmployees
} = require('../controllers/employeeCtrl');

const router = express.Router();


router.get('/allemployee',  authMiddleware, isAdmin, getAllUsersEmployees)

router.get('/:userId', authMiddleware, getAllEmployeesForUser)


router.post('/register/:userId', authMiddleware, addEmployeeToAdmin);
router.post('/login', loginEmployeeCtrl);
router.get('/:userId/:employeeId', authMiddleware, getEmployeeById)

router.put('/edit-employee/:userId/employee/:employeeId', authMiddleware, updateEmployee)
router.put('/employeestatus/:userId/:employeeId', authMiddleware, updateStatusOfEmployee)


router.delete('/delete/:userId/:employeeId', authMiddleware, deleteEmployee)


module.exports = router;    