const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

// Generate access token
userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        { _id: this._id },
        process.env.JWT_ACCESS_SECRET || 'your-jwt-access-secret',
        { expiresIn: '15m' }
    );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function() {
    const refreshToken = jwt.sign(
        { _id: this._id },
        process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret',
        { expiresIn: '7d' }
    );
    this.refreshToken = refreshToken;
    return refreshToken;
};

// Compare password
userSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 