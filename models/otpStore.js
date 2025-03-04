const otpStore = new Map();

// Function to store OTP with expiry time
function storeOtp(email, otp, expiryTimeInMs = 300000) { // Default expiry time is 5 minutes
    const expiresAt = Date.now() + expiryTimeInMs;
    otpStore.set(email, { otp, expiresAt });
}

// Function to get OTP by email
function getOtp(email) {
    return otpStore.get(email);
}

// Function to delete OTP for a specific email
function deleteOtp(email) {
    otpStore.delete(email);
}

// Function to clean up expired OTPs
function cleanupExpiredOtps() {
    const now = Date.now();
    otpStore.forEach((value, email) => {
        if (value.expiresAt < now) {
            otpStore.delete(email);
        }
    });
}

module.exports = {
    storeOtp,
    getOtp,
    deleteOtp,
    cleanupExpiredOtps
};