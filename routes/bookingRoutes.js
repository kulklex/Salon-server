const express = require('express');
const router = express.Router();
const Booking = require('../models/bookingModel');


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



// Create a booking
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
