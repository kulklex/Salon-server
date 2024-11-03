const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    date: {
        type: String, 
        required: true
    },
    time: {
        type: String, 
        required: true
    },
    userId: {
        type: String, // Store the userId to identify who booked the slot
    },
    customerEmail: {
        type: String,
        required: true,
    },
    customerPhone: {
        type: String,
        required: true
    }
});


const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
