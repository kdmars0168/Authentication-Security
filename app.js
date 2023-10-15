//importing neccesary modules
import 'dotenv/config'
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";

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
mongoose.connect("mongodb://127.0.0.1:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true })
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
  password: String
});

// Add passport-local-mongoose plugin
userSchema.plugin(passportLocalMongoose);

// Create mongoose model for user schema
const User = mongoose.model("User", userSchema);

// Configure passport to use the local strategy
passport.use(User.createStrategy());

// Serialize and deserialize user for session management
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Define a route for the home page
app.get("/", async (req, res) => {
  try {
    res.render("home");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Define a route for the login page
app.get("/login", async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Define a route for the register page
app.get("/register", async (req, res) => {
  try {
    res.render("register");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Define a route for the secrets page
app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

// Define a route for logout
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Error during logout:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.redirect("/");
    }
  });
});

//Define Post route for register
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  // Attempt to register a new user
  User.register(new User({ username: username }), password, (err, user) => {
    if (err) {
      // Handle registration errors
      console.error("Error during registration:", err);

      if (err.name === "UserExistsError") {
        // Email already exists, provide a user-friendly response
        res.status(400).send("Email already exists. Please choose a different email.");
      } else {
        // Other errors, respond with a generic error message
        res.status(500).send("Internal Server Error");
      }
    } else {
      // Registration successful, authenticate and redirect
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
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
