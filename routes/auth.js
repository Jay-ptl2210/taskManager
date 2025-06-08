const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { loginLimiter, registrationLimiter } = require('../config/security');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

// Email verification route
router.get('/verify-email/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('auth/verify-email', {
                error: 'Invalid or expired verification token'
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.render('auth/verify-email', {
            success: 'Email verified successfully! You can now login.'
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.render('auth/verify-email', {
            error: 'An error occurred during email verification'
        });
    }
});

// Forgot password route
router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot-password');
});

router.post('/forgot-password', loginLimiter, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.render('auth/forgot-password', {
                error: 'No account found with that email address'
            });
        }

        user.setPasswordResetToken();
        const resetToken = await sendPasswordResetEmail(user);
        user.passwordResetToken = resetToken;
        await user.save();

        res.render('auth/forgot-password', {
            success: 'Password reset instructions have been sent to your email'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.render('auth/forgot-password', {
            error: 'An error occurred while processing your request'
        });
    }
});

// Reset password route
router.get('/reset-password/:token', (req, res) => {
    res.render('auth/reset-password', { token: req.params.token });
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            passwordResetToken: req.params.token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('auth/reset-password', {
                error: 'Invalid or expired password reset token',
                token: req.params.token
            });
        }

        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.render('auth/login', {
            success: 'Password has been reset successfully. Please login with your new password.'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.render('auth/reset-password', {
            error: 'An error occurred while resetting your password',
            token: req.params.token
        });
    }
});

module.exports = router; 