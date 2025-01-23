const { google } = require("googleapis");
require('dotenv').config(); 

// Initialize OAuth2 client (OAuth2 method)
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_TIFE_ID,
  process.env.GOOGLE_CLIENT_TIFE_SECRET,
  process.env.GOOGLE_REDIRECT_TIFE_URI
);

// Set credentials if refresh token is already available
if (process.env.GOOGLE_REFRESH_TIFE_TOKEN) {
  oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TIFE_TOKEN });
}

// Function to add booking to Google Calendar
async function addBookingToCalendar(bookingDetails) {
  const { date, time, customerName, selectedStyle, customerEmail, customerPhone, bookingNote } = bookingDetails;

  try {
    // Initialize the Google Calendar API with OAuth2 authentication
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    // Define the start time
    const startTime = new Date(`${date}T${time}`);

    // Create the event
    const event = {
      summary: `${selectedStyle} Booking with ${customerName}`,
      description: `Customer Email: ${customerEmail}\nCustomer Phone: ${customerPhone}\nNote: ${bookingNote || "None"}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "Europe/London", // Adjust to your timezone
      },
      // No end time provided, event will have only a start time
      reminders: {
        useDefault: false, // Override default reminders
        overrides: [
          { method: "email", minutes: 1440 }, // Email reminder 1 day before (1440 minutes = 24 hours)
          { method: "popup", minutes: 60 }, // Popup reminder 1 hour before
        ],
      },
    };

    // Insert the event into the calendar
    const response = await calendar.events.insert({
      calendarId: "primary", // Use "primary" for the authenticated user's main calendar
      resource: event,
    });

    console.log("Event added to Google Calendar:", response.data.htmlLink);
    return response.data.htmlLink; // Return the event link if needed
  } catch (error) {
    console.error("Error adding booking to Google Calendar:", error);
  }
}

module.exports = { addBookingToCalendar };
