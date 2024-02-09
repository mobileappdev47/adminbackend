
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

    if (!user.location) {
      user.location = []; // Initialize the locations array if it's undefined
    }

    if (!user.employees || user.employees.length === 0) {
      return res.status(404).json({ success: false, message: 'User has no employees' });
    }

    // Find the employees by IDs within the user's employees array
    const employeesToAdd = user.employees.filter(emp => employeeIds.includes(emp._id.toString()));
    if (!employeesToAdd || employeesToAdd.length !== employeeIds.length) {
      return res.status(404).json({ success: false, message: 'One or more employees not found' });
    }

    const newLocation = new Location({
      admin: _id, // Set the admin field to the user's ID
      locationname,
      address,
      percentage,
      employees: employeesToAdd,
    });

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
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the location exists for this user
    const locationIndex = user.location.findIndex(id => id.toString() === locationId);
    if (locationIndex === -1) {
      return res.status(404).json({ success: false, message: 'Location not found for this user' });
    }

    // Remove the location ID from the user's locations array
    user.location.splice(locationIndex, 1);
    await user.save();

    // Delete the location from the Location model
    await Location.findByIdAndDelete(locationId);

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

// all locations of user
// const getAllLocationsForUser = asyncHandler(async (req, res) => {
//   const { userId } = req.params;
//   const { searchQuery, page, limit, statusofpayment } = req.query;

//   try {
//     const user = await User.findById(userId).populate({
//       path: 'location',
//       select: 'locationname address percentage machines createdAt updatedAt employees admin activeStatus statusOfPayment',
//       populate: [
//         {
//           path: 'machines',
//           model: 'Machine',
//           select: '_id machineNumber serialNumber',
//         },
//         {
//           path: 'employees',
//           model: 'Employee',
//           select: 'firstname lastname',
//         },
//         {
//           path: 'admin',
//           model: 'User',
//           select: 'firstname lastname _id',
//         },
//       ],
//     });

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     let locations = user.location;

//     // Filter locations based on statusofpayment
//     if (statusofpayment !== undefined) {
//       const statusFilter = statusofpayment.toLowerCase() === 'true'; // Assuming statusofpayment is a string 'true' or 'false'
//       locations = locations.filter(location => location.statusOfPayment === statusFilter);
//     }

//     locations = await Promise.all(locations.map(async location => {
//       const numofmachines = location.machines.length;
//       return { ...location.toObject(), numofmachines };
//     }));

//     if (searchQuery) {
//       const lowerCaseSearchQuery = searchQuery.toLowerCase();

//       // If statusofpayment is provided, filter locations before searching
//       if (statusofpayment !== undefined) {
//         locations = locations.filter(location =>
//           location.locationname.toLowerCase().includes(lowerCaseSearchQuery)
//         );
//       } else {
//         // If statusofpayment is not provided, search across all locations
//         locations = locations.filter(location =>
//           location.locationname.toLowerCase().includes(lowerCaseSearchQuery)
//         );
//       }
//     }

//     let paginatedLocations;

//     if (page && limit) {
//       const totalCount = locations.length;
//       const totalPages = Math.ceil(totalCount / limit);
//       const currentPage = parseInt(page);

//       const skip = (currentPage - 1) * limit;

//       paginatedLocations = locations.slice(skip, skip + limit);
//       res.json({ locations: paginatedLocations, totalPages, currentPage });
//     } else {
//       res.json({ locations, totalCount: locations.length });
//     }
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
const getAllLocationsForUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page, limit } = req.query;
  let { statusofpayment, searchQuery } = req.query;

  try {
    // Load stored filter criteria from request headers
    const storedStatusOfPayment = req.headers['x-statusofpayment'];
    const storedSearchQuery = req.headers['x-searchquery'];

    // Use stored values if not provided in the request
    statusofpayment = statusofpayment !== undefined ? statusofpayment : storedStatusOfPayment;
    searchQuery = searchQuery !== undefined ? searchQuery : storedSearchQuery;

    const user = await User.findById(userId).populate({
      path: 'location',
      select: 'locationname address percentage machines createdAt updatedAt employees admin activeStatus statusOfPayment',
      populate: [
        {
          path: 'machines',
          model: 'Machine',
          select: '_id machineNumber serialNumber',
        },
        {
          path: 'employees',
          model: 'Employee',
          select: 'firstname lastname',
        },
        {
          path: 'admin',
          model: 'User',
          select: 'firstname lastname _id',
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let locations = user.location;

    // Filter locations based on statusofpayment
    if (statusofpayment !== undefined) {
      const statusFilter = statusofpayment.toLowerCase() === 'true'; // Assuming statusofpayment is a string 'true' or 'false'
      locations = locations.filter(location => location.statusOfPayment === statusFilter);
    }

    locations = await Promise.all(locations.map(async location => {
      const numofmachines = location.machines.length;
      return { ...location.toObject(), numofmachines };
    }));

    if (searchQuery) {
      const lowerCaseSearchQuery = searchQuery.toLowerCase();

      // If statusofpayment is provided, filter locations before searching
      if (statusofpayment !== undefined) {
        locations = locations.filter(location =>
          location.locationname.toLowerCase().includes(lowerCaseSearchQuery)
        );
      } else {
        // If statusofpayment is not provided, search across all locations
        locations = locations.filter(location =>
          location.locationname.toLowerCase().includes(lowerCaseSearchQuery)
        );
      }
    }

    let paginatedLocations;

    if (page && limit) {
      const totalCount = locations.length;
      const totalPages = Math.ceil(totalCount / limit);
      const currentPage = parseInt(page);

      const skip = (currentPage - 1) * limit;

      paginatedLocations = locations.slice(skip, skip + limit);
      res.json({ locations: paginatedLocations, totalPages, currentPage });

      return; // Added return statement to avoid setting headers after sending the response
    }

    res.json({ locations, totalCount: locations.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const totalLoactions = asyncHandler(async(req,res ) => {
  try {
    const totalLocations = await Location.countDocuments();
    res.json({ totalLocations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
})



module.exports = { addLocationToUser, updateLocation, deleteLocation, getAllLocationsForUser, getLocationbyId, updateActiveStatus, totalLoactions }
