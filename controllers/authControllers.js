const User = require('../models/user');
const passport = require('passport');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const nodemailer = require('nodemailer'); // For sending emails
const otpStore = require('../models/otpStore')
// Show Login Page
exports.showLogin = (req, res) => {
  res.render('login', { title: 'Login' }); // Pass the title variable
};


// Show Register Page
exports.showRegister = (req, res) => {
  res.render('register', { title: 'Register' });
};


// Handle Register
exports.register = async (req, res) => {
  const { name, email, phone, address, password } = req.body;

  if (!name || !email || !phone || !address || !password) {
    return res.render('register', { title: 'Register', errorMessage: 'All fields are required.' });
  }

  try {
    const client = new MongoClient(process.env.MONGO_URI);  // Use Atlas URI
    await client.connect();
    const db = client.db('Restaurant');
    const customers = db.collection('customer');

    // Check if email already exists
    const existingUser = await customers.findOne({ email });
    if (existingUser) {
      return res.render('register', { title: 'Register', errorMessage: 'Email already exists.' });
    }

   // Generate OTP
   const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
   console.log(otp)
   otpStore.storeOtp(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // Store OTP for 5 minutes
    console.log(otpStore.getOtp(email))
   // Send OTP via email
   const transporter = nodemailer.createTransport({
     service: 'gmail',
     auth: {
       user: process.env.EMAIL_USER, // email
       pass: process.env.EMAIL_PASS, // email password
     },
   });

   await transporter.sendMail({
     from: process.env.EMAIL_USER,
     to: email,
     subject: 'Your OTP for Registration',
     text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
   });
   req.session.registrationData = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    password: req.body.password
    };
   // Redirect to OTP confirmation page
   res.render('otpConfirm', { title: 'OTP Confirmation',errorMessage:'none', email });
  } catch (err) {
    console.error(err);
    res.render('register', { title: 'Register', errorMessage: 'Registration failed. Please try again.' });
  }
};

// Handle Login with Token
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', { title: 'Login', errorMessage: 'Email and password are required.' });
  }

  try {
    const client = new MongoClient(process.env.MONGO_URI); // Use Atlas URI
    await client.connect();
    const db = client.db('Restaurant');
    const customers = db.collection('customer');

    // Check if user exists
    const user = await customers.findOne({ email:email });
    if (!user) {
      return res.render('login', { title: 'Login', errorMessage: 'Invalid email or password.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { title: 'Login', errorMessage: 'Invalid email or password.' });
    }

    // Redirect to dashboard with user data
    res.render('dashboard', { title: 'Dashboard', user });
  } catch (err) {
    console.error(err);
    res.render('login', { title: 'Login', errorMessage: 'Login failed. Please try again.' });
  }
};

// Handle Logout
exports.logout = (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success_msg', 'You are logged out');
    res.redirect('/login');
  });
};
