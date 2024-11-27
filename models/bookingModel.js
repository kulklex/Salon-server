const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    bookingId: { 
        type: String, 
        unique: true
     },
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
    customerName: {
        type: String,
        required: true,
    },
    customerEmail: {
        type: String,
        required: true,
    },
    customerPhone: {
        type: String,
        required: true
    },
    selectedStyle: {
        type: String,
        required: true
    }, 
    bookingNote: {
        type: String
    },
    isConfirmed: { type: Boolean, default: false },
    stripeSessionId: { type: String },
    paymentIntentId: { type: String },
});


const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;