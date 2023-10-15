//importing neccesary modules
import 'dotenv/config'
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import md5 from "md5";

// Create an express app
const app = express();
// Parse URL-encoded data using the built-in middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
// Set the view engine to EJS
app.set('view engine', 'ejs');

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



// Create mongoose model for user schema
const User = mongoose.model("User", userSchema);

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

//Define Post route for register
app.post("/register",async (req, res) => {
  try {
    const newUser = new User({
      email: req.body.username,
      password: md5(req.body.password)
    });

    await newUser.save().then(() => {
      res.render("secrets");
    });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

//Define Post route for login
app.post("/login", async(req,res)=>{ 
  try {
    const { username, password } = req.body;

    User.findOne({ email: username }).then(result => {
      if (result && md5(password) === result.password) {
        console.log('User logged in successfully.');
        res.render('secrets');
      } else {
        res.status(401).send('Invalid username or password');
      }
    }).catch(err => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Start the server and listen on port 3000
app.listen(3000, async () => {
  try {
    console.log("Server started on port 3000");
  } catch (error) {
    console.error("Error starting server:", error);
  }
});
