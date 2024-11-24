const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes')
const connectDB  = require('./config/db');

const dotenv = require("dotenv")

// Initialize the Express app
const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS


//dotenv config
dotenv.config()

// Connect to MongoDB
connectDB();

// Use the booking routes
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/auth', userRoutes)

// Home Route
app.get('/', (req, res) => {
    res.json({message: 'App is running'})
})

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

