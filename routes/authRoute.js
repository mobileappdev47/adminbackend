const express = require('express');
const {
    createUser,
    loginUserCtrl,
    loginAdmin,
    getaUser,
    deleteaUser,
    updatedUser,
    getAllUsers,
    addMachineToUserLocation,
    updateMachineInUserLocation,
    deleteMachineFromUser,
    getMachinesOfUser,
    getMachinebyId,
    getMachinesByLocationId,
    addRestrictionDate,
    getAllEmployee,
    updateStatusUser,
    blockedAdmin,
    unblockedAdmin,
    updateMachineStatus,
} = require('../controllers/userCtrl');
const { authMiddleware, isAdmin } = require('../middlerwares/authMiddleware');
const router = express.Router();

router.post('/register',authMiddleware, isAdmin, createUser);
router.post('/restrictiondate/:userId', authMiddleware, isAdmin, addRestrictionDate)

router.post('/login', loginUserCtrl);

router.post('/admin-login', loginAdmin);

router.get('/alluser', authMiddleware, isAdmin, getAllUsers);
router.get('/allemployee', authMiddleware, isAdmin, getAllEmployee);


router.get('/:id', authMiddleware, getaUser);

router.delete('/:id', authMiddleware, isAdmin, deleteaUser);

router.put('/edit-user/:id', authMiddleware, isAdmin, updatedUser);
router.put('/block/:userId', authMiddleware, isAdmin, blockedAdmin);
router.put('/unblock/:userId', authMiddleware, isAdmin, unblockedAdmin);

router.put('/editstatus/:adminId', authMiddleware, isAdmin, updateStatusUser);




// machine
router.post('/addmachine/:userId', authMiddleware, addMachineToUserLocation)
router.get('/machines/:userId', authMiddleware, getMachinesOfUser)
router.get('/machines/location/:locationId', authMiddleware, getMachinesByLocationId)
router.put('/edit-machine/:userId/:locationId/:machineId', authMiddleware, updateMachineInUserLocation)
router.put('/machine/:userId/:locationId/:machineId/acitvestatus', authMiddleware, updateMachineStatus)
router.delete('/delete-machine/:userId/machines/:locationId/location/:machineId', authMiddleware, deleteMachineFromUser)
router.get('/machine/:userId/:machineId', authMiddleware, getMachinebyId)


module.exports = router;    