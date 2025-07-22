const express = require("express");
const router = express.Router();
const Booking = require("../models/bookingModel");
const UnavailableDate = require("../models/UnavailableDates");
const { addBookingToCalendar } = require("../middlewares/googleCalendar");
const { transporter } = require("../utils/transporter");

require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Function to send the booking confirmation email
async function sendBookingConfirmationEmail(
  customerEmail,
  adminEmail,
  bookingDetails
) {
  const { date, time, name, service, email, phone, extra } = bookingDetails;

  const logoUrl =
    "https://lh3.googleusercontent.com/a/ACg8ocK9p43t6YEhik-lF7FCHpkRI3L5gu3Df2G48m0WYVUVaJIcr1o=s80-p";
  const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0ea2bd; color: white; padding: 20px; text-align: center;">
          <img src="${logoUrl}" alt="Company Logo" style="max-width: 120px; margin-bottom: 10px;" />
          <h1 style="margin: 0; font-size: 24px;">Booking Confirmation</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p style="font-size: 16px; color: #333;">Dear <strong>${name}</strong>,</p>
          <p style="font-size: 16px; color: #333;">Thank you for booking with us!</p>
          <p style="font-size: 16px; color: #333;">Your £15 deposit is now confirmed. Here are your booking details:</p>
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
              <td style="padding: 10px; border: 1px solid #ddd;">${
                extra ? extra : "None"
              }</td>
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
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>~Phone:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Extra Services:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${
                extra ? extra : "None"
              }</td>
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
    subject: "Booking Confirmation",
    html: customerEmailHtml,
  };

  // Email to the admin
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: "New Booking Notification",
    html: adminEmailHtml,
  };

  try {
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(adminMailOptions);
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
  }
}

// Verify Webhook Requests
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Extract booking details from the metadata
      const {
        bookingId,
        date,
        time,
        customerName,
        customerEmail,
        customerPhone,
        selectedStyle,
        bookingNote,
      } = session.metadata;

      try {
        // Recheck if slot is still available
        const normalizeDate = (input) =>
          new Date(input).toISOString().split("T")[0];
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

        // Save booking to the database
        const newBooking = new Booking({
          bookingId,
          date,
          time,
          customerName,
          customerEmail,
          customerPhone,
          selectedStyle,
          bookingNote,
          stripeSessionId: session.id,
          isConfirmed: true,
        });

        await newBooking.save();

        // Send confirmation email
        await sendBookingConfirmationEmail(
          customerEmail,
          process.env.ADMIN_EMAIL,
          {
            date,
            time,
            name: customerName,
            service: selectedStyle,
            email: customerEmail,
            phone: customerPhone,
            extra: bookingNote,
          }
        );

        // Add to Google Calendar
        // await addBookingToCalendar({
        //   date,
        //   time,
        //   customerName,
        //   selectedStyle,
        //   customerEmail,
        //   customerPhone,
        //   bookingNote,
        // });
      } catch (error) {
        console.error("Error saving confirmed booking:", error);
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;
