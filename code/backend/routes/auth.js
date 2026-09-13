const express = require('express');
const User = require('../models/user');
const Hospital = require('../models/hospital');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');
const dbConnect = require('../lib/dbConnect'); // ✅ 1. IMPORT THE DB CONNECTION HELPER

const router = express.Router();

// --- POST /api/auth/register ---
router.post('/register', async (req, res) => {
  const { username, password, role, hospitalName, specialCode } = req.body;
  const cleanUsername = username ? username.trim() : '';

  if (!cleanUsername || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    await dbConnect();

    const userExists = await User.findOne({ username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') }, role });
    if (userExists) {
      return res.status(400).json({ message: 'This username is already registered for the selected role.' });
    }
    if (role === 'admin') {
      if (!hospitalName || !specialCode) {
        return res.status(400).json({
          message: 'Hospital Name and a Special Code are required for admin registration.'
        });
      }
      const formattedCode = specialCode.toUpperCase();
      let hospital = await Hospital.findOne({ code: formattedCode });
      if (!hospital) {
        hospital = new Hospital({ name: hospitalName, code: formattedCode });
        await hospital.save();
      }
    }
    const user = await User.create({
      username: cleanUsername,
      password,
      role: role || 'individual',
      hospitalName: role === 'admin' ? hospitalName : undefined,
      hospitalCode: role === 'admin' ? specialCode.toUpperCase() : undefined
    });
    res.status(201).json({
      _id: user._id,
      username: user.username,
      role: user.role,
      message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} user registered successfully!`
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: 'Database/Server error during registration.', error: error.message });
  }
});

// --- POST /api/auth/login ---
router.post('/login', async (req, res) => {
  try {
    await dbConnect();

    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Username, password, and role are required.' });
    }

    const cleanUsername = username.trim();
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("Login Error: JWT_SECRET environment variable is not defined.");
      return res.status(500).json({ message: 'Server configuration error: JWT_SECRET is missing.' });
    }

    const user = await User.findOne({ username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') }, role });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials for the selected role.' });
    }
    const payload = {
      id: user._id,
      username: user.username,
      role: user.role,
    };
    const token = jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '1d' }
    );
    res.status(200).json({
      message: 'Login successful',
      token: token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        hospitalName: user.hospitalName || null,
        hospitalCode: user.hospitalCode || null
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

// --- GET /api/auth/verify ---
// This protected route verifies a token and returns user data.
// Note: The 'protect' middleware handles its own database interaction.
// If it also experiences cold starts, it should be updated to use dbConnect() as well.
router.get('/verify', protect, (req, res) => {
  res.status(200).json({ user: req.user });
});

module.exports = router;