const mongoose = require("mongoose");

const unavailableDateSchema = new mongoose.Schema({
  dates: [{ type: Date, unique: true }] // Array of dates
});

const UnavailableDate = mongoose.model("UnavailableDate", unavailableDateSchema);
module.exports = UnavailableDate;
