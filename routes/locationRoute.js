const express = require('express');
const {
    addLocationToUser, updateLocation, deleteLocation, getAllLocationsForUser, getLocationbyId, updateActiveStatus, totalLoactions
} = require('../controllers/locationCtrl');
const { authMiddleware, isAdmin } = require('../middlerwares/authMiddleware');

const router = express.Router();

router.post('/create', authMiddleware, addLocationToUser);
router.put('/edit-location/:userId/location/:locationId', authMiddleware, updateLocation)
router.put('/:locationId/activestatus', updateActiveStatus)

router.delete('/delete-location/:userId/location/:locationId', authMiddleware, deleteLocation)
router.get('/:userId', authMiddleware, getAllLocationsForUser)
router.get('/:userId/:locationId', authMiddleware, getLocationbyId)
router.get('/', authMiddleware, isAdmin, totalLoactions)


module.exports = router;    