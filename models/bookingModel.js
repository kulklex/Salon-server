const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  date: String,
  time: String,
  customerName: String,
  customerEmail: String,
  customerPhone: String
});

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;
