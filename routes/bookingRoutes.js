const express = require('express');
const router = express.Router();
const Booking = require('../models/bookingModel');
const auth = require('../middlewares/auth'); // Middleware for token verification


// Check Availability
router.post('/check-availability', async (req, res) => {
    const { date} = req.body;

  try {
    const bookings = await Booking.find({ date });
    const unavailableTimes = bookings.map(booking => booking.time); // Array of booked times
    res.json({ unavailableTimes });
  } catch (error) {
    res.status(500).json({ message: 'Error checking availability' });
  }
  });


//  // Create Booking
//   router.post("/create-booking", auth, async (req, res) => {
//     try {
//       const { date, time, customerName, customerEmail, customerPhone } = req.body;
//       const userId = req.user.id; // Get user ID from decoded token
  
//       const booking = await Booking.create({
//         userId,
//         date,
//         time,
//         customerName,
//         customerEmail,
//         customerPhone
//       });
  
//       res.status(201).json({ success: true, message: "Booking created", booking });
//     } catch (error) {
//       res.status(500).json({ success: false, message: "Error creating booking" });
//     }
//   });
  
// Delete Booking
  router.delete("/delete-booking/:id", auth, async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.id;
  
      // Find the booking to delete
      const booking = await Booking.findOne({ _id: bookingId, userId });
  
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found or access denied" });
      }
  
      await Booking.deleteOne({ _id: bookingId });
      res.status(200).json({ success: true, message: "Booking deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error deleting booking" });
    }
  });
  


router.post('/create-booking', async (req, res) => {
    const { date, time, customerName, customerEmail, customerPhone } = req.body;
  
    // Validate that date and time are provided and not empty
    if (!date || !time) {
      return res.status(400).json({ message: 'Date and time are required' });
    }
  
    try {
      const newBooking = new Booking({
        date,
        time,
        customerName,
        customerEmail,
        customerPhone
      });
  
      await newBooking.save();
      res.status(201).json({ message: 'Booking confirmed', booking: newBooking });
    } catch (error) {
        console.error(error)
      if (error.code === 11000) {
        // Handle duplicate key error gracefully
        return res.status(400).json({ message: 'This slot is already booked' });
      }
      res.status(500).json({ message: 'Error creating booking' });
    }
  });

// Cancel a booking
// router.post('/cancel', async (req, res) => {
//     const { slot, userId } = req.body;
//     try {
//         const booking = await Booking.findOne({ slot, userId });
//         if (!booking) {
//             return res.status(404).json({ message: 'Booking not found or unauthorized' });
//         }

//         // Delete the booking
//         await Booking.deleteOne({ slot, userId });
//         res.status(200).json({ message: 'Booking canceled successfully' });
//     } catch (error) {
//         res.status(500).json({ message: 'Error canceling booking' });
//     }
// });

module.exports = router;
