const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoClient, ObjectId } = require("mongodb");
const User = require("../models/user");

module.exports = function (passport) {
  // ================= LOCAL STRATEGY =================
  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        // Match User
        const user = await User.findOne({ email });
        if (!user) return done(null, false, { message: "Email not registered" });

        // Match Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return done(null, false, { message: "Password incorrect" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // ================= GOOGLE STRATEGY =================
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
          await client.connect();
          const db = client.db("Restaurant");
          const customers = db.collection("customer");

          // Look for user by email
          let user = await customers.findOne({ email: profile.emails[0].value });

          if (!user) {
            // Create new user object
            user = {
              name: profile.displayName,
              email: profile.emails[0].value,
              phone: "0000000",
              address: "null",
              password: null, // Omit password since using OAuth
              createdAt: new Date(),
            };
            const result = await customers.insertOne(user);
            user._id = result.insertedId;
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // ================= SERIALIZE & DESERIALIZE =================
  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user._id);
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();
      const db = client.db("Restaurant");
      const customers = db.collection("customer");
      const objectId = new ObjectId(id);
      const user = await customers.findOne({ _id: objectId });

      if (!user) {
        console.log("User not found in the database for ID:", id);
        return done(null, false);
      }

      console.log("Deserialized user:", user);
      done(null, user);
    } catch (err) {
      console.error("Error deserializing user:", err);
      done(err, null);
    }
  });
};
