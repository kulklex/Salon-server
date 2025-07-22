const express = require("express");
const router = express.Router();
const Booking = require("../models/bookingModel");
const auth = require("../middlewares/auth");
const UnavailableDate = require("../models/UnavailableDates");
const moment = require("moment");
const { transporter } = require("../utils/transporter");

require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Send a message
router.post("/send-message", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "All fields are required" });
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
    html: customerEmailHtml,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res
      .status(500)
      .json({ message: "There was an error sending your message" });
  }
});

// Check Availability
router.post("/check-availability", async (req, res) => {
  const { date } = req.body;

  // Define durations for styles
  const styleDurations = {
    "Small Box braids": 5,
    "Medium Box braids": 4,
    "Big Box braids": 3,
    "Small Goddess braids": 5,
    "Medium Goddess braids": 4,
    "Big Goddess braids": 3,
    "Small Knotless Braids": 4,
    "Medium Knotless Braids": 4,
    "Big Knotless Braids": 4,
    "Faux Locs": 4,
    "Starter Locs": 3,
    "Feed-in Cornrows": 2,
    "Dread Twist": 2,
    Cornrows: 2,
    "Boys Cornrows": 2,
    "Stitch cornrows": 2,
    "Wig Cornrows": 2,
    "Small Singles Twist": 3,
    "Medium Singles Twist": 2,
    "Singles Twist": 2,
    "Plug Twist": 3,
    "Barrel twist": 3,
    "Silk Press": 2,
    "Deep Conditioning / Hydration Treatment": 2,
    "Scalp Treatment": 2,
    "Wash and Go": 2,
  };

  try {
    const bookings = await Booking.find({ date });
    const unavailableTimes = bookings.map((booking) => booking.time); // Array of booked times
    const unavailableSlots = new Set(); // Use a set to avoid duplicate slots

    // Get today's date and current time
    const currentDate = moment().format("YYYY-MM-DD");
    const currentTime = moment();

    // Loop through each booking and mark affected slots
    bookings.forEach((booking) => {
      const startTime = moment(booking.time, "hh:mm A"); // Parse time in 12-hour format
      const duration = styleDurations[booking.selectedStyle] || 1;

      // Add all affected slots based on the duration
      for (let i = 0; i < duration; i++) {
        const slot = startTime.clone().add(i, "hours").format("hh:mm A");
        unavailableSlots.add(slot); // Add the slot to unavailable slots
      }
    });

    // Mark past time slots for the current day as unavailable
    if (date === currentDate) {
      const timeSlots = [
        "10:00 AM",
        "11:00 AM",
        "12:00 PM",
        "01:00 PM",
        "02:00 PM",
        "03:00 PM",
        "04:00 PM",
        "05:00 PM",
      ];

      timeSlots.forEach((slot) => {
        const slotTime = moment(slot, "hh:mm A");
        if (slotTime.isBefore(currentTime)) {
          unavailableSlots.add(slot); // Add passed times to unavailable slots
        }
      });
    }

    res.json({
      unavailableTimes,
      unavailableSlots: Array.from(unavailableSlots),
    });
  } catch (error) {
    console.error("Error checking availability: error: ", error);
    res.status(500).json({ message: "Error checking availability" });
  }
});

// Create a booking, Firstly a Stripe Checkout session, webhook will handle saving to DB
router.post("/create-booking", async (req, res) => {
  const {
    date,
    time,
    customerName,
    customerEmail,
    customerPhone,
    selectedStyle,
    bookingNote,
  } = req.body;

  const bookingId = `${date}-${time}-${customerEmail}`;

  if (!date || !time || !customerName || !customerEmail || !customerPhone || !selectedStyle) {
    return res
      .status(400)
      .json({ message: "Please provide all required details." });
  }

  try {
    // Check if date is unavailable
    const normalizeDate = (input) => new Date(input).toISOString().split("T")[0];
    const normalizedChosenDate = normalizeDate(date);
    const unavailableDatesDoc = await UnavailableDate.findOne({});
    const unavailableDates = unavailableDatesDoc?.dates || [];

    const isDateUnavailable = unavailableDates.some(
      (e) => normalizeDate(e) === normalizedChosenDate
    );

    if (isDateUnavailable) {
      return res
        .status(400)
        .json({ message: "Selected date is unavailable for booking." });
    }

     // Check if time slot already booked
    // const existing = await Booking.findOne({ date, time });
    // if (existing) {
    //   return res.status(400).json({ message: "Time slot already booked." });
    // }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Deposit for ${selectedStyle}`,
              description: `Date: ${date} & Time: ${time}`,
            },
            unit_amount: 1500, // £15 deposit
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/index.html?status=success`,
      cancel_url: `${process.env.CLIENT_URL}/index.html?status=cancel`,
      metadata: {
        bookingId,
        date,
        time,
        customerName,
        customerEmail,
        customerPhone,
        selectedStyle,
        bookingNote,
      },
    });

    res.status(200).json({ id: session.id });
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error gracefully
      return res.status(400).json({ message: "This slot is already booked" });
    }
    console.error("Error creating Stripe session:", error);
    res.status(500).json({ message: "Error creating Stripe session." });
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

    res.status(200).json({
      success: true,
      message: "Dates set as unavailable",
      data: updatedUnavailableDates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error setting unavailable dates",
      error,
    });
  }
});

// Get unavailable dates and fully booked dates
router.get("/admin/get-unavailable-dates", async (req, res) => {
  try {
    // Fetch unavailable dates from UnavailableDate model
    const unavailableDatesDoc = await UnavailableDate.findOne({}).select(
      "dates"
    );
    const unavailableDates = unavailableDatesDoc
      ? unavailableDatesDoc.dates
      : [];

    // Find fully booked dates from bookings where all time slots are booked
    const bookings = await Booking.aggregate([
      {
        $group: {
          _id: "$date", // Group by date
          bookedCount: { $sum: 1 }, // Count bookings per date
        },
      },
      {
        $match: { bookedCount: { $gte: 8 } }, // Change 8 if max time slots per day is altered
      },
      {
        $project: { date: "$_id", _id: 0 }, // Project the date field for response
      },
    ]);

    // Extract fully booked dates
    const fullyBookedDates = bookings.map((booking) => booking.date);

    // Combine unavailable and fully booked dates
    const allUnavailableDates = Array.from(
      new Set([...unavailableDates, ...fullyBookedDates])
    );

    res.status(200).json({ success: true, dates: allUnavailableDates });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching unavailable dates",
      error,
    });
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
      return res.status(404).json({
        success: false,
        message: "Date not found in unavailable list",
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Date removed from unavailable list" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing unavailable date",
      error,
    });
  }
});

// Delete Booking
router.delete("/admin/delete-booking/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Find the booking to delete
    const booking = await Booking.findOne({ _id: bookingId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or access denied",
      });
    }

    await Booking.deleteOne({ _id: bookingId });
    res
      .status(200)
      .json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting booking" });
  }
});

// Remove past unavailable dates
router.post("/admin/remove-past-unavailable-dates", auth, async (req, res) => {
  try {
    // Fetch the document with the unavailable dates
    const unavailableDatesDoc = await UnavailableDate.findOne({}).select(
      "dates"
    );

    if (
      !unavailableDatesDoc ||
      !unavailableDatesDoc.dates ||
      unavailableDatesDoc.dates.length === 0
    ) {
      return res
        .status(404)
        .json({ success: false, message: "No unavailable dates found" });
    }

    // Get today's date without time (set time to midnight for accurate comparison)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter out dates that are today or later
    const pastDates = unavailableDatesDoc.dates.filter(
      (date) => new Date(date) < today
    );

    if (pastDates.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "No past dates to remove." });
    }

    // Remove the past dates
    const updateResult = await UnavailableDate.updateOne(
      {},
      { $pull: { dates: { $in: pastDates } } } // Remove only past dates
    );

    if (updateResult.nModified === 0) {
      return res.status(404).json({
        success: false,
        message: "No past dates removed. Dates might not exist anymore.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Past unavailable dates removed successfully",
      removedDates: pastDates,
    });
  } catch (error) {
    console.error("Error removing past unavailable dates:", error);
    res.status(500).json({
      success: false,
      message: "Error removing past unavailable dates",
      error,
    });
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
      return res
        .status(200)
        .json({ success: true, message: "No past bookings to remove." });
    }

    // Extract the IDs of past bookings to delete
    const pastBookingIds = pastBookings.map((booking) => booking._id);

    // Delete the past bookings
    const deleteResult = await Booking.deleteMany({
      _id: { $in: pastBookingIds },
    });

    res.status(200).json({
      success: true,
      message: "Past bookings removed successfully.",
      removedBookings: pastBookings,
    });
  } catch (error) {
    console.error("Error removing past bookings:", error);
    res.status(500).json({
      success: false,
      message: "Error removing past bookings.",
      error,
    });
  }
});

module.exports = router;
