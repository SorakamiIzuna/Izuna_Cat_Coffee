require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { MongoClient } = require('mongodb');
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const app = express();
const expressLayouts = require('express-ejs-layouts');
const User = require('./models/user');
const connectDB = require("./config/db");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
app.use(expressLayouts);
app.set('layout', 'layouts/layout'); // Default layout file

// Passport Config
require("./config/passport")(passport);

// MongoDB Connection
connectDB();
// Middleware

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// Express session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }  // 1 day in milliseconds
}));


// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const client = new MongoClient(process.env.MONGO_URI);  // Use Atlas URI
    await client.connect();
    const db = client.db('Restaurant');
    const customers = db.collection('customer');
      // Look for user by email
      let user = await customers.findOne({ email:profile.emails[0].value });
      if (!user) {
        // Create new user (Mongoose will handle `_id` generation)
        user = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          phone: '0000000',
          address:'null',
          password:'tempPass'
        });
        await customers.insertOne(user);
      }
      
      return done(null, user);
  } catch (err) {
      return done(err, null);
  }
}));


// Flash
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.user = req.user || null; // Thêm dòng này
  next();
});
// API Routes
app.use("/api/menus", require("./routes/api/menuRoutes"));

// Auth Routes phải đặt trước Main Routes
app.use("/auth", require("./routes/api/authRoutes"));

// Admin Routes
app.use("/admin", require("./routes/views/adminRoutes"));

// Main Routes (để cuối cùng)
app.use("/", require("./routes/views/homeRoutes"));
// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));