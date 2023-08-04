// Import required modules
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const { graphqlHTTP } = require("express-graphql");
const dotenv = require("dotenv");

// Import GraphQL schema and resolvers
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");

// Import custom middleware and utility functions
const auth = require("./middleware/auth");
const { clearImage } = require("./util/file");

// Load environment variables from .env file
dotenv.config();

// Create Express app
const app = express();

// Configure Multer for file uploads
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + "-" + file.originalname);
  },
});

// Define file filter for allowed image file types
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Parse incoming JSON data
app.use(bodyParser.json()); // application/json

// Handle file uploads with Multer middleware
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

// Serve static files from the "images" directory
app.use("/images", express.static(path.join(__dirname, "images")));

// Set up CORS headers and handle preflight requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Apply authentication middleware
app.use(auth);

// Route to handle uploading a new post image
app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    throw new Error("Not authenticated!");
  }
  if (!req.file) {
    return res.status(200).json({ message: "No file provided!" });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({ message: "File stored.", filePath: req.file.path });
});

// Set up GraphQL middleware using express-graphql
app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true, // Enable the GraphiQL interface for testing the API
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      // Format error response to include additional data
      const data = err.originalError.data;
      const message = err.message || "An error occurred.";
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    },
  })
);

// Global error handler for Express
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

// Connect to MongoDB database and start the server on port 8080
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.w5b2eln.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;
mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    app.listen(process.env.PORT || 8080);
  })
  .catch((err) => console.log(err));
