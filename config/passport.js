const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
// Load User Model
const User = require('../models/ser');

module.exports = function (passport) {
  passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      // Match User
      const user = await User.findOne({ email });
      if (!user) return done(null, false, { message: 'Email not registered' });

      // Match Password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: 'Password incorrect' });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
    // Passport session setup: serialize and deserialize user
    passport.serializeUser((user, done) => {
      console.log("Serializing user:", user._id); 
      done(null, user._id);  // Store the user ID in the session
    });
    
    passport.deserializeUser(async (id, done) => {
      try {
        const client = new MongoClient(process.env.MONGO_URI);  // Use Atlas URI
        await client.connect();
        const db = client.db('Restaurant');
        const customers = db.collection('customer');
        const objectId = new ObjectId(id);
        const user = await customers.findOne({ _id:objectId });
        if (!user) {
          console.log("User not found in the database for ID:", id);  // Log if no user is found
          return done(null, false);  // Return false if user is not found
        }
        
        console.log("Deserialized user:", user);  // Log the deserialized user
        done(null, user);  // Pass the user object to the session
      } catch (err) {
        console.error("Error deserializing user:", err);  // Log any error during deserialization
        done(err, null);  // Handle error
      }
    });
    
    
};