
const asyncHandler = require("express-async-handler");
const Location = require('../models/locationModel')
const User = require('../models/userModel')
const Employee = require('../models/employeModel')
const Machine = require('../models/machineModel')

const addLocationToUser = asyncHandler(async (req, res) => {
  const { _id } = req.admin; // Assuming you extract user ID from the bearer token
  const { employeeIds, locationname, address, percentage } = req.body; // Array of employee IDs

  try {
    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing employeeIds in the request body' });
    }

    const user = await User.findById(_id).populate({
      path: 'location',
      populate: {
        path: 'employees',
        model: 'Employee'
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.employees || user.employees.length === 0) {
      return res.status(404).json({ success: false, message: 'User has no employees' });
    }

    // Find the employees by IDs within the user's employees array
    const employeesToAdd = user.employees.filter(emp => employeeIds.includes(emp._id.toString()));
    if (!employeesToAdd || employeesToAdd.length !== employeeIds.length) {
      return res.status(404).json({ success: false, message: 'One or more employees not found' });
    }

    const newLocation = new Location({ locationname, address, percentage });

    // Add the filtered employees to the new location's employees array
    newLocation.employees.push(...employeesToAdd);
    await newLocation.save();

    // Add the new location to the user's locations
    user.location.push(newLocation);
    await user.save();

    const updatedUser = await User.findById(_id).populate({
      path: 'location',
      populate: {
        path: 'employees',
        model: 'Employee'
      }
    });

    return res.status(201).json({ success: true, message: 'New location added to user successfully', user: updatedUser });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});



// update location
const updateLocation = asyncHandler(async (req, res) => {
  const { userId, locationId } = req.params;
  const { employeeIds, locationname, address, percentage } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the location belongs to the user
    const isLocationBelongsToUser = user.location.includes(locationId);
    if (!isLocationBelongsToUser) {
      return res.status(404).json({ success: false, message: 'Location not found for the user' });
    }

    const updatedLocation = await Location.findOneAndUpdate(
      { _id: locationId },
      { $set: { locationname, address, percentage, employees: employeeIds } },
      { new: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    return res.json({ success: true, message: 'Location details updated successfully', location: updatedLocation });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

//update active status
const updateActiveStatus = asyncHandler(async (req, res) => {
  try {
    const { locationId } = req.params;
    const { activeStatus } = req.body;

    // Find the location by ID
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    // Update the activeStatus
    location.activeStatus = activeStatus;
    await location.save();

    return res.json({ success: true, message: 'Active status updated successfully', location });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// delete location
const deleteLocation = asyncHandler(async (req, res) => {
  const { userId, locationId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isValidLocationId = user.location.some(id => id.toString() === locationId);
    if (!isValidLocationId) {
      return res.status(404).json({ success: false, message: 'Location not found for this user' });
    }

    user.location = user.location.filter(id => id.toString() !== locationId);
    await user.save();

    return res.json({ success: true, message: 'Location deleted successfully', user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// get location by id
const getLocationbyId = asyncHandler(async (req, res) => {
  try {
    const { locationId, userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const location = await Location.findOne({ _id: locationId }).populate('machines');
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    // Check if the location belongs to the user
    if (!user.location.includes(locationId)) {
      return res.status(403).json({ message: 'Location does not belong to the user' });
    }

    res.json({ location });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

//   const getLocationsOfUser = asyncHandler(async (req, res) => {
//     const { userId } = req.params; // Assuming userId is passed in the URL

//     try {
//       const user = await User.findById(userId).populate('location');
//       if (!user) {
//         return res.status(404).json({ message: 'User not found' });
//       }

//       res.json({ locations: user.location });
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   });


const getAllLocationsForUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { searchLocation, page = 1, limit = 8 } = req.query;

  try {
    const user = await User.findById(userId).populate({
      path: 'location',
      select: 'locationname address percentage machines createdAt updatedAt employees',
      populate: {
        path: 'machines',
        model: 'Machine',
        select: '_id'
      }
    }).populate({
      path: 'location',
      populate: {
        path: 'employees',
        model: 'Employee',
        select: 'firstname lastname'
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let locations = user.location;

    locations = await Promise.all(locations.map(async location => {
      const numofmachines = location.machines.length;
      return { ...location.toObject(), numofmachines };
    }));

    if (searchLocation) {
      locations = locations.filter(location =>
        location.locationname.toLowerCase().includes(searchLocation.toLowerCase())
      );
    }

    const totalCount = locations.length;
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = parseInt(page);

    const skip = (currentPage - 1) * limit;

    const paginatedLocations = locations.slice(skip, skip + limit);

    res.json({
      success: true,
      message: 'Locations retrieved successfully',
      data: { locations: paginatedLocations, totalPages, currentPage },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
});






module.exports = { addLocationToUser, updateLocation, deleteLocation, getAllLocationsForUser, getLocationbyId, updateActiveStatus }
