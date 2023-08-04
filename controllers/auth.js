// Import required modules and models
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

const User = require("../models/user");
dotenv.config();

// Function to handle user signup
exports.signup = async (req, res, next) => {
  // Validate request data using express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  // Extract user data from the request body
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;

  try {
    // Hash the password using bcryptjs
    const hashedPw = await bcrypt.hash(password, 12);

    // Create a new User instance with the hashed password
    const user = new User({
      email: email,
      password: hashedPw,
      name: name,
    });
    // Save the user to the database
    const result = await user.save();

    // Respond with a success message and the created user's ID
    res.status(201).json({ message: "User created!", userId: result._id });
  } catch (err) {
    // Handle errors and pass them to the next middleware
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Function to handle user login
exports.login = async (req, res, next) => {
  // Extract user login credentials from the request body
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  try {
    // Find the user with the provided email in the database
    const user = await User.findOne({ email: email });

    if (!user) {
      // If user is not found, throw an error with status code 401 (Unauthorized)
      const error = new Error("A user with this email could not be found.");
      error.statusCode = 401;
      throw error;
    }

    // Compare the provided password with the stored hashed password using bcryptjs
    loadedUser = user;
    const isEqual = await bcrypt.compare(password, user.password);

    // If passwords don't match, throw an error with status code 401 (Unauthorized)
    if (!isEqual) {
      const error = new Error("Wrong password!");
      error.statusCode = 401;
      throw error;
    }

    // Generate a JSON Web Token (JWT) with user data for authentication
    const token = jwt.sign(
      {
        email: loadedUser.email,
        userId: loadedUser._id.toString(),
      },
      process.env.JWT_TOKEN,
      { expiresIn: "1h" }
    );

    // Respond with the JWT and the user's ID
    res.status(200).json({ token: token, userId: loadedUser._id.toString() });
  } catch (err) {
    // Handle errors and pass them to the next middleware
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Function to get the user status for an authenticated user
exports.getUserStatus = async (req, res, next) => {
  try {
    // Find the user by ID in the database
    const user = await User.findById(req.userId);
    if (!user) {
      // If user is not found, throw an error with status code 404 (Not Found)
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }

    // Respond with the user's status
    res.status(200).json({ status: user.status });
  } catch (err) {
    // Handle errors and pass them to the next middleware
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Function to update the user status for an authenticated user
exports.updateUserStatus = async (req, res, next) => {
  // Extract the new status from the request body
  const newStatus = req.body.status;
  try {
    // Find the user by ID in the database
    const user = await User.findById(req.userId);

    // If user is not found, throw an error with status code 404 (Not Found)
    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }

    // Update the user's status and save the changes to the database
    user.status = newStatus;
    await user.save();
    // Respond with a success message
    res.status(200).json({ message: "User updated." });
  } catch (err) {
    // Handle errors and pass them to the next middleware
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
