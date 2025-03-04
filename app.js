require("dotenv").config();
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const app = express();
const expressLayouts = require('express-ejs-layouts');
const User = require('./models/user');
const connectDB = require("./config/db");
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

// Google OAuth Routes
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);


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