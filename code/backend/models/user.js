const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    // --- FIX: The unique constraint is removed to allow the same username for different roles ---
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['individual', 'admin'],
    required: true,
  },
  // Required only for admin users
  hospitalName: {
    type: String,
    required: function () { return this.role === 'admin'; },
    trim: true,
  },
  // ✅ NEW FIELD: Store the special hospital code for admin users
  hospitalCode: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// --- Password Hashing Middleware ---
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// --- Password Comparison Method ---
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
