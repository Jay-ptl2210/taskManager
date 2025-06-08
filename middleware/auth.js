const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Get access token from cookie
        const accessToken = req.cookies.accessToken;
        const refreshToken = req.cookies.refreshToken;
        
        if (!accessToken && !refreshToken) {
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.status(401).redirect('/login?error=Please login to continue');
        }

        try {
            // Try to verify access token
            if (accessToken) {
                const decoded = jwt.verify(
                    accessToken,
                    process.env.JWT_ACCESS_SECRET || 'your-jwt-access-secret'
                );
                const user = await User.findById(decoded._id);
                
                if (user) {
                    req.user = user;
                    res.locals.user = user;
                    return next();
                }
            }

            // If access token is invalid or expired, try refresh token
            if (refreshToken) {
                const decoded = jwt.verify(
                    refreshToken,
                    process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret'
                );
                
                const user = await User.findById(decoded._id);
                
                if (user && user.refreshToken === refreshToken) {
                    // Generate new access token
                    const newAccessToken = user.generateAccessToken();
                    
                    // Set new access token in cookie
                    res.cookie('accessToken', newAccessToken, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        maxAge: 15 * 60 * 1000 // 15 minutes
                    });
                    
                    req.user = user;
                    res.locals.user = user;
                    return next();
                }
            }

            // If both tokens are invalid
            throw new Error('Invalid authentication');

        } catch (error) {
            // Clear cookies and return 401
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.status(401).redirect('/login?error=Session expired. Please login again');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.status(401).redirect('/login?error=Authentication failed');
    }
};

module.exports = auth; 