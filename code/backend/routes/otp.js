const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Otp = require('../models/Otp'); // 1. Import your Mongoose OTP model
const dbConnect = require('../lib/dbConnect'); // 2. Import the DB helper

// --- Send OTP ---
// Generates a real OTP, hashes it, and stores it in the database with an expiration.
router.post('/send', async (req, res) => {
  await dbConnect(); // Ensure DB is connected

  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    // Generate a random 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // For a real app, you would send this 'generatedOtp' via an SMS gateway like Twilio.
    // For the hackathon, we'll log it to the console for you to see and use for testing.
    console.log(`✅ [OTP] Generated OTP for ${phone} is: ${generatedOtp}`);

    // Hash the OTP before saving
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(generatedOtp, salt);

    // Remove any old OTPs for this number and save the new one
    await Otp.deleteMany({ phone });
    await Otp.create({ phone, otp: hashedOtp });

    return res.json({ success: true, message: 'A new OTP has been generated.' });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

// --- Verify OTP ---
// Securely finds and compares the provided OTP with the hashed version in the database.
router.post('/verify', async (req, res) => {
  await dbConnect(); // Ensure DB is connected

  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP are required' });
  }

  try {
    // Find the most recent OTP for this phone number
    const otpRecord = await Otp.findOne({ phone }).sort({ createdAt: -1 });

    // Check if an OTP record exists (it might have expired and been auto-deleted)
    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP.' });
    }

    // Securely compare the plaintext OTP from the user with the hashed OTP from the DB
    const isValid = await bcrypt.compare(otp, otpRecord.otp);

    if (isValid) {
      // Clean up: delete the OTP after successful verification so it can't be reused
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.json({ success: true, message: 'OTP verified successfully' });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP.' });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

module.exports = router;