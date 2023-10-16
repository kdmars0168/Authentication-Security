//importing neccesary modules
import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import findOrCreate from "mongoose-findorcreate";

// Create an express app
const app = express();

// Parse URL-encoded data using the built-in middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Enable sessions
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true})
  .then(() => {
    console.log("Connected to MongoDB");
    // Your app.listen() code here
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });


// Define the schema for individual items
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

// Add passport-local-mongoose plugin and findOrCreate plugin
userSchema.plugin(passportLocalMongoose, { usernameQueryFields: ['email'] });
userSchema.plugin(findOrCreate);

// Create mongoose model for user schema
const User = mongoose.model("User", userSchema);

// Configure passport to use the local strategy
passport.use(User.createStrategy());

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => {
  console.log("Serializing user:", user);
  done(null, { id: user.id, googleId: user.googleId });
});

passport.deserializeUser(async (serialized, done) => {
  try {
    const foundUser = await User.findOne({
      $or: [{ _id: serialized.id }, { googleId: serialized.googleId }],
    });
    done(null, foundUser);
  } catch (err) {
    done(err, null);
  }
});

// Configure Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/secrets',
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const user = await User.findOrCreate({ googleId: profile.id });
        return cb(null, user);
      } catch (err) {
        return cb(err, null);
      }
    }
  )
);

// Define a route for the home page
app.get("/", async (req, res) => {
  try {
    res.render("home");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Google OAuth route
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect to secrets page
    res.redirect("/secrets");
  }
);

// Define a route for the login page
app.get("/login", async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Define a route for the register page
app.get("/register", (req, res) => {
  try {
    res.render("register");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Define a route for the secrets page
app.get("/secrets", async (req, res) => {
  try {
    const foundUser = await User.find({ "secret": { $ne: null } });
    res.render("secrets", { usersWithSecrets: foundUser });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

// Define a route for the submit page
app.get("/submit", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      // Check if the user logged in with Google
      if (req.user.googleId !== undefined) {
        // User authenticated with Google
        res.render("submit");
      } else {
        // User authenticated locally
        res.render("submit");
      }
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error in /submit route:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/submit", async (req, res) => {
  const submittedSecret = req.body.secret;
  console.log(req.user.id);

  try {
    const foundUser = await User.findById(req.user.id);
    if (foundUser) {
      foundUser.secret = submittedSecret;
      await foundUser.save();
      res.redirect("/secrets");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

// Define a route for logout
app.get("/logout", (req, res) => {
  try {
    req.logout();
    res.redirect("/");
  } catch (err) {
    console.error("Error during logout:", err);
    res.status(500).send("Internal Server Error");
  }
});

//Define Post route for register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.register(new User({ username: username }), password);
    passport.authenticate("local")(req, res, () => {
      res.redirect("/secrets");
    });
  } catch (err) {
    console.error("Error during registration:", err);

    if (err.name === "UserExistsError") {
      res.status(400).send("Email already exists. Please choose a different email.");
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
});

//Define Post route for login
app.post("/login", passport.authenticate("local", {
  successRedirect: "/secrets",
  failureRedirect: "/login"
}));

// Start the server and listen on port 3000
app.listen(3000, async () => {
  try {
    console.log("Server started on port 3000");
  } catch (error) {
    console.error("Error starting server:", error);
  }
});