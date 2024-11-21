const express = require('express');
const router = express.Router();
const Booking = require('../models/bookingModel');
const auth = require('../middlewares/auth'); // Middleware for token verification
const UnavailableDate = require('../models/UnavailableDates');
const nodemailer = require('nodemailer');

require('dotenv').config();

// Setup email transporter
let transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: '587',
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS,
  },
});


// Function to send the booking confirmation email
async function sendBookingConfirmationEmail(customerEmail, adminEmail, bookingDetails) {
  const { date, time, name, service } = bookingDetails;

  // Confirmation email to the customer
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: 'Booking Confirmation',
    html: `
      <h2>Booking Confirmed!</h2>
      <p>Dear ${name},</p>
      <p>Your booking has been successfully confirmed. Here are the details: </p>
      <ul>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Service:</strong> ${service}</li>
      </ul>
      <p>Thank you for booking with us!</p>
    `,
  };

    // Notification email to the admin
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: 'New Booking Notification',
      html: `
        <h2>New Booking Received</h2>
        <p>A new booking has been made. Here are the details: </p>
        <ul>
          <li><strong>Customer Name:</strong> ${name}</li>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Time:</strong> ${time}</li>
          <li><strong>Service:</strong> ${service}</li>
        </ul>
        <p>Please check the booking system for more information.</p>
      `,
    };

  try {
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(adminMailOptions);
    console.log('Booking confirmation email sent.');
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
  }
}


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

      // Call function to send email
    await sendBookingConfirmationEmail(customerEmail, process.env.ADMIN_EMAIL, {
      date,
      time,
      name: customerName,
      service: selectedStyle,
    });
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

// Get unavailable dates and fully booked dates
router.get("/admin/get-unavailable-dates", async (req, res) => {
  try {
    // Fetch unavailable dates from UnavailableDate model
    const unavailableDatesDoc = await UnavailableDate.findOne({}).select("dates");
    const unavailableDates = unavailableDatesDoc ? unavailableDatesDoc.dates : [];

    // Find fully booked dates from bookings where all time slots are booked
    const bookings = await Booking.aggregate([
      {
        $group: {
          _id: "$date", // Group by date
          bookedCount: { $sum: 1 } // Count bookings per date
        }
      },
      {
        $match: { bookedCount: { $gte: 3 } } // Change 3 to the max time slots per day
      },
      {
        $project: { date: "$_id", _id: 0 } // Project the date field for response
      }
    ]);

    // Extract fully booked dates
    const fullyBookedDates = bookings.map((booking) => booking.date);

    // Combine unavailable and fully booked dates
    const allUnavailableDates = Array.from(new Set([...unavailableDates, ...fullyBookedDates]));

    res.status(200).json({ success: true, dates: allUnavailableDates });
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
router.delete("/delete-booking/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Find the booking to delete
    const booking = await Booking.findOne({ _id: bookingId});

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
