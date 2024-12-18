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
    updateStatusUser,
    blockedAdmin,
    unblockedAdmin,
    updateMachineStatus,
    createSuperAdmin,
    unableAdmin,
    getLastTwoPendingRepairsAllEmployees,
    getRecentCollectionReportsForUserEmployees,
    getTotalCollectionReportsForUserEmployees,
    getTotalInNumbersForUserEmployees,
    getAllRepairsAllEmployees,
    getTotalCollectionReportsAdminForUserEmployees
} = require('../controllers/userCtrl');
const { authMiddleware, isAdmin } = require('../middlerwares/authMiddleware');

const router = express.Router();

router.post('/register',authMiddleware, isAdmin, createUser);
router.post('/register/superadmin', createSuperAdmin);

router.post('/restrictiondate/:userId', authMiddleware, isAdmin, addRestrictionDate)

router.post('/login', loginUserCtrl);

router.post('/admin-login', loginAdmin);

router.get('/alluser', authMiddleware, isAdmin, getAllUsers);

router.get('/:id', authMiddleware, getaUser);

router.delete('/:id', authMiddleware, isAdmin, deleteaUser);

router.put('/edit-user/:id', authMiddleware, isAdmin, updatedUser);
router.put('/unble-disable/:userId', authMiddleware, isAdmin, unableAdmin)
router.put('/block/:userId', authMiddleware, isAdmin, blockedAdmin);
router.put('/unblock/:userId', authMiddleware, isAdmin, unblockedAdmin);

router.put('/editstatus/:adminId', authMiddleware, isAdmin, updateStatusUser);
router.get('/total-collection/report/:userId', authMiddleware, getTotalCollectionReportsForUserEmployees)
router.get('/collectionall/report/:userId', authMiddleware, getTotalCollectionReportsAdminForUserEmployees)
router.get('/total-num-collection/report/:userId', authMiddleware, getTotalInNumbersForUserEmployees)
router.get('/recent-collection/report/:userId',authMiddleware, getRecentCollectionReportsForUserEmployees)
router.get('/pending-repairs/:userId', authMiddleware, getLastTwoPendingRepairsAllEmployees)
router.get('/repairs/:userId', authMiddleware, getAllRepairsAllEmployees)


// machine
router.post('/addmachine/:userId', authMiddleware, addMachineToUserLocation)
router.get('/machines/:userId', authMiddleware, getMachinesOfUser)
router.get('/machines/location/:locationId', authMiddleware, getMachinesByLocationId)
router.put('/edit-machine/:userId', authMiddleware, updateMachineInUserLocation)
router.put('/machine/:machineId/acitvestatus', updateMachineStatus)
router.delete('/delete-machine/:userId/machines/:locationId/location/:machineId', authMiddleware, deleteMachineFromUser)
router.get('/machine/:userId/:machineId', authMiddleware, getMachinebyId)


module.exports = router;    