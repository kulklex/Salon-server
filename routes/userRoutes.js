const express = require('express');
const User = require('../models/userModel');
const bcryptjs = require('bcryptjs');
const router = express.Router();
const jwt = require('jsonwebtoken')
const auth = require('../middlewares/auth')
const { OAuth2Client } = require('google-auth-library');

// Register route
router.post('/register', async (req,res) => {
    try {
        const existingUser = await User.findOne({email: req.body.email})

        if (existingUser) {
            return res.status(200).send({message: "User Already Exist"})
        }
        const email = req.body.email
        const password = req.body.password
        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(password, salt)
        req.body.password = hashPassword
        const user = await User.create(req.body)
        user.userId = user?._id
        const token = jwt.sign({ email, id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })
        res.status(201).json({ success:true, user, token, message: "User Successfully Created" })
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false, message:`Register Controller: ${error.message}`})
    }
})

// Login route
router.post('/login', async (req, res) => {
    const {email, password} = req.body
    try {
        const existingUser = await User.findOne({ email });
        if (!existingUser) return res.status(404).json({ message: "Invalid email or password" });

        const isPasswordCorrect = await bcryptjs.compare(password, existingUser.password);
        if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid email or password" });

        const token = jwt.sign({email: existingUser.email, id: existingUser._id }, process.env.JWT_SECRET_KEY, {expiresIn: '1h'} )
        res.status(200).json({success:true, user: existingUser, token, message: `Welcome ${existingUser.name}`})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false, message:`Login Controller: ${error.message}`})
    }

})

// Initialize Google OAuth client with your client ID
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Login Route
router.post('/google-login', async (req, res) => {
  const { token } = req.body;

  try {
    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    // Check if user already exists in the database
    let user = await User.findOne({ email });

    if (!user) {
      // If user does not exist, create a new one
      user = new User({
        name,
        email,
        password: "", // Password can be empty for Google users
      });
      await user.save();
    }

    // Generate JWT token
    const jwtToken = jwt.sign({ email: user.email, id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    res.status(200).json({
      success: true,
      user,
      token: jwtToken,
      message: `Welcome ${user.name}`,
    });
  } catch (error) {
    console.error("Error in Google login:", error);
    res.status(500).json({ success: false, message: "Google login failed" });
  }
});

 // Reset Password Controller
router.post('/resetpassword', async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const hashedPassword = await bcryptjs.hash(newPassword, 12);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: 'Could not reset password', error });
    }
})


router.post("/fetchUser", auth, async (req, res) => {
    try {
        const user = await User.findOne({_id:req.body.userId})
        if (!user) {
            return res.status(200).json({message:"User not found", success:false})
        } else {
            res.status(200).json({success:true, data: {
                name: user.name,
                email: user.email
            }})
            console.log(res)
        }
    } catch (error) {
        res.status(500).json({ message: 'Auth Error', error });
    }
})

module.exports = router