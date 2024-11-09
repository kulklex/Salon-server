const express = require('express');
const router = express.Router();
const Booking = require('../models/bookingModel');
const auth = require('../middlewares/auth'); // Middleware for token verification
const UnavailableDate = require('../models/UnavailableDates');


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
    const { date, time, customerName, customerEmail, customerPhone, selectedStyle, bookingNote } = req.body;
  
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
        customerPhone,
        selectedStyle,
        bookingNote,
      });
  
      await newBooking.save();
      res.status(201).json({ message: 'Booking confirmed', booking: newBooking });
    } catch (error) {
      if (error.code === 11000) {
        // Handle duplicate key error gracefully
        return res.status(400).json({ message: 'This slot is already booked' });
      }
      res.status(500).json({ message: 'Error creating booking' });
    }
  });


// Set unavailable dates
router.post("/admin/set-unavailable-dates", auth, async (req, res) => {
  try {
    const { dates } = req.body; // Expecting an array of dates

    // Add dates to the list of unavailable dates, avoiding duplicates
    const updatedUnavailableDates = await UnavailableDate.updateOne(
      {},
      { $addToSet: { dates: { $each: dates } } },
      { upsert: true } // Create the document if it doesn't exist
    );

    res.status(200).json({ success: true, message: "Dates set as unavailable", data: updatedUnavailableDates });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error setting unavailable dates", error });
  }
});

// Get unavailable dates
router.get("/admin/get-unavailable-dates", async (req, res) => {
  try {
    const unavailableDates = await UnavailableDate.findOne({}).select("dates");
    res.status(200).json({ success: true, dates: unavailableDates ? unavailableDates.dates : [] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching unavailable dates", error });
  }
});


// Remove an unavailable date
router.post("/admin/remove-unavailable-date", auth, async (req, res) => {
  try {
    const { date } = req.body;
    const updateResult = await UnavailableDate.updateOne(
      {},
      { $pull: { dates: new Date(date) } }
    );

    if (updateResult.nModified === 0) {
      return res.status(404).json({ success: false, message: "Date not found in unavailable list" });
    }

    res.status(200).json({ success: true, message: "Date removed from unavailable list" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error removing unavailable date", error });
  }
});



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
