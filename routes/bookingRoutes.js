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
  const { date, time, name, service, extra } = bookingDetails;

  const logoUrl = 'https://lh3.googleusercontent.com/a/ACg8ocK9p43t6YEhik-lF7FCHpkRI3L5gu3Df2G48m0WYVUVaJIcr1o=s80-p';
  const customerEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0ea2bd; color: white; padding: 20px; text-align: center;">
        <img src="${logoUrl}" alt="Company Logo" style="max-width: 120px; margin-bottom: 10px;" />
        <h1 style="margin: 0; font-size: 24px;">Booking Confirmation</h1>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p style="font-size: 16px; color: #333;">Dear <strong>${name}</strong>,</p>
        <p style="font-size: 16px; color: #333;">Thank you for booking with us! Here are your booking details:</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${time}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Service:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${service}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Extra Services:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${extra ? extra : 'None'}</td>
          </tr>
        </table>
        <p style="font-size: 16px; color: #333;">We look forward to serving you. If you have any questions, feel free to contact us.</p>
        <p style="font-size: 16px; color: #333;">Best regards,<br /><strong>TifeHairHaven</strong></p>
      </div>
      <div style="background-color: #0ea2bd; color: white; text-align: center; padding: 10px;">
        <p style="font-size: 14px; margin: 0;">© ${new Date().getFullYear()} TifeHairHaven. All Rights Reserved.</p>
      </div>
    </div>
  `;

  const adminEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0ea2bd; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">New Booking Notification</h1>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p style="font-size: 16px; color: #333;">A new booking has been made with the following details:</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Customer Name:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${time}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Service:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${service}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Extra Services:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${extra ? extra : 'None'}</td>
          </tr>
        </table>
        <p style="font-size: 16px; color: #333;">Please log in to the booking system for more details.</p>
      </div>
      <div style="background-color: #0ea2bd; color: white; text-align: center; padding: 10px;">
        <p style="font-size: 14px; margin: 0;">© ${new Date().getFullYear()} TifeHairHaven. All Rights Reserved.</p>
      </div>
    </div>
  `;

  // Email to the customer
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: 'Booking Confirmation',
    html: customerEmailHtml,
  };

  // Email to the admin
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: 'New Booking Notification',
    html: adminEmailHtml,
  };

  try {
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(adminMailOptions);
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
  }
}

// Send a message
router.post('/send-message', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'All fields are required' });
  }

   const customerEmailHtml = `
   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #0ea2bd; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">New Contact Message</h1>
    </div>
     <div style="padding: 20px; background-color: #f9f9f9;">
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Name:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Subject:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Message:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${message}</td>
          </tr>
        </table>
      </div>
     <div style="background-color: #0ea2bd; color: white; text-align: center; padding: 10px;">
        <p style="font-size: 14px; margin: 0;">© ${new Date().getFullYear()} TifeHairHaven. All Rights Reserved.</p>
     </div>
   </div>
 `;

   const mailOptions = {
    from: email,
    to: process.env.ADMIN_EMAIL,
    subject: `New message from ${name}: ${subject}`,
    html: customerEmailHtml
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'There was an error sending your message' });
  }
})

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
      extra: bookingNote
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
        $match: { bookedCount: { $gte: 5 } } // Change 5 to the max time slots per day
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
router.delete("/admin/delete-booking/:id", async (req, res) => {
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


// Remove past unavailable dates
router.post("/admin/remove-past-unavailable-dates", auth, async (req, res) => {
  try {
    // Fetch the document with the unavailable dates
    const unavailableDatesDoc = await UnavailableDate.findOne({}).select("dates");

    if (!unavailableDatesDoc || !unavailableDatesDoc.dates || unavailableDatesDoc.dates.length === 0) {
      return res.status(404).json({ success: false, message: "No unavailable dates found" });
    }

    // Get today's date without time (set time to midnight for accurate comparison)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter out dates that are today or later
    const pastDates = unavailableDatesDoc.dates.filter(
      (date) => new Date(date) < today
    );

    if (pastDates.length === 0) {
      return res.status(200).json({ success: true, message: "No past dates to remove." });
    }

    // Remove the past dates
    const updateResult = await UnavailableDate.updateOne(
      {},
      { $pull: { dates: { $in: pastDates } } } // Remove only past dates
    );

    if (updateResult.nModified === 0) {
      return res.status(404).json({ success: false, message: "No past dates removed. Dates might not exist anymore." });
    }

    res.status(200).json({
      success: true,
      message: "Past unavailable dates removed successfully",
      removedDates: pastDates,
    });
  } catch (error) {
    console.error("Error removing past unavailable dates:", error);
    res.status(500).json({ success: false, message: "Error removing past unavailable dates", error });
  }
});


// Remove past bookings
router.post("/admin/remove-past-bookings", auth, async (req, res) => {
  try {
    // Get today's date and set time to midnight for accurate comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ensure time is set to midnight
    console.log("Today:", today); // Debugging output

    // Fetch past bookings (where the booking date is strictly before today)
    const pastBookings = await Booking.find({
      date: { $lt: today }, // Only select bookings with dates before today
    }).select("_id date");

    console.log("Past Bookings:", pastBookings); // Debugging output

    if (!pastBookings || pastBookings.length === 0) {
      return res.status(200).json({ success: true, message: "No past bookings to remove." });
    }

    // Extract the IDs of past bookings to delete
    const pastBookingIds = pastBookings.map((booking) => booking._id);

    // Delete the past bookings
    const deleteResult = await Booking.deleteMany({ _id: { $in: pastBookingIds } });

    res.status(200).json({
      success: true,
      message: "Past bookings removed successfully.",
      removedBookings: pastBookings,
    });
  } catch (error) {
    console.error("Error removing past bookings:", error);
    res.status(500).json({ success: false, message: "Error removing past bookings.", error });
  }
});




module.exports = router;
