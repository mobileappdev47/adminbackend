
const asyncHandler = require("express-async-handler");
const Location = require('../models/locationModel')
const User = require('../models/userModel')
const Employee = require('../models/employeModel')
const Machine = require('../models/machineModel')

const addLocationToUser = asyncHandler(async (req, res) => {
  const { _id } = req.admin; // Assuming you extract user ID from the bearer token
  const { employeeIds } = req.body; // Array of employee IDs

  try {
    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ message: 'Invalid or missing employeeIds in the request body' });
    }

    const user = await User.findById(_id).populate({
      path: 'location',
      populate: {
        path: 'employees',
        model: 'Employee'
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.employees || user.employees.length === 0) {
      return res.status(404).json({ message: 'User has no employees' });
    }

    // Find the employees by IDs within the user's employees array
    const employeesToAdd = user.employees.filter(emp => employeeIds.includes(emp._id.toString()));
    if (!employeesToAdd || employeesToAdd.length !== employeeIds.length) {
      return res.status(404).json({ message: 'One or more employees not found' });
    }

    const { locationname, address, percentage } = req.body;
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

    res.json({ message: 'New location added to user successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// update location
const updateLocation = asyncHandler(async (req, res) => {
  const { userId, locationId } = req.params;
  const { employeeIds, locationname, address, percentage } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the location belongs to the user
    const isLocationBelongsToUser = user.location.includes(locationId);
    if (!isLocationBelongsToUser) {
      return res.status(404).json({ message: 'Location not found for the user' });
    }

    const updatedLocation = await Location.findOneAndUpdate(
      { _id: locationId },
      { $set: { locationname, address, percentage, employees: employeeIds } },
      { new: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json({ message: 'Location details updated successfully', location: updatedLocation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




const deleteLocation = asyncHandler(async (req, res) => {
  const { userId, locationId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isValidLocationId = user.location.some(id => id.toString() === locationId);
    if (!isValidLocationId) {
      return res.status(404).json({ message: 'Location not found for this user' });
    }

    user.location = user.location.filter(id => id.toString() !== locationId);
    await user.save();

    res.json({ message: 'Location deleted successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
});



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
  const { searchLocation } = req.query;

  try {
    const user = await User.findById(userId).populate({
      path: 'location',
      select: 'locationname address percentage machines createdAt updatedAt employees', // Include 'machines' field for aggregation
      populate: {
        path: 'machines',
        model: 'Machine',
        select: '_id' // Select only '_id' to count machines
      }
    }).populate({
      path: 'location',
      populate: {
        path: 'employees', // Populate employees within each location
        model: 'Employee', // Replace 'Employee' with your employee model name
        select: 'firstname lastname' // Select the fields you want for employees
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let locations = user.location;

    // Count the number of machines in each location
    locations = await Promise.all(locations.map(async location => {
      const numofmachines = location.machines.length; // Count the machines
      return { ...location.toObject(), numofmachines }; // Add numofmachines to the location object
    }));

    if (searchLocation) {
      locations = locations.filter(location =>
        location.locationname.toLowerCase().includes(searchLocation.toLowerCase())
      );
    }

    res.json({ locations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});








module.exports = { addLocationToUser, updateLocation, deleteLocation, getAllLocationsForUser, getLocationbyId }
