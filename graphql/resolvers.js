const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

const User = require("../models/user");
const Post = require("../models/post");
const { clearImage } = require("../util/file");

dotenv.config();

module.exports = {
  // Function to create a new user
  createUser: async function ({ userInput }, req) {
    // Validate user input (email and password)
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: "E-Mail is invalid." });
    }
    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })
    ) {
      errors.push({ message: "Password too short!" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // Check if the user with the same email already exists
    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      const error = new Error("User exists already!");
      throw error;
    }

    // Hash the user's password using bcrypt
    const hashedPw = await bcrypt.hash(userInput.password, 12);

    // Create and save the new user to the database
    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPw,
    });
    const createdUser = await user.save();

    // Respond with the newly created user data
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },

  // Function to handle user login
  login: async function ({ email, password }) {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("User not found.");
      error.code = 401;
      throw error;
    }

    // Compare the provided password with the hashed password in the database
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password is incorrect.");
      error.code = 401;
      throw error;
    }

    // If the passwords match, generate a JSON Web Token (JWT)
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      process.env.JWT_TOKEN,
      { expiresIn: "1h" }
    );
    // Respond with the token and the user ID
    return { token: token, userId: user._id.toString() };
  },

  // Function to create a new post
  createPost: async function ({ postInput }, req) {
    // Check if the user is authenticated
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    // Validate post input (title and content)
    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Title is invalid." });
    }
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid." });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // Find the user by ID
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid user.");
      error.code = 401;
      throw error;
    }

    // Create a new post with the provided data
    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    });

    // Save the new post to the database
    const createdPost = await post.save();

    // Associate the post with the user and save the user data
    user.posts.push(createdPost);
    await user.save();

    // Respond with the newly created post data
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },

  // Function to fetch paginated posts
  posts: async function ({ page }, req) {
    if (!req.isAuth) {
      // Check if the user is authenticated
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    // Set a default page value if not provided
    if (!page) {
      page = 1;
    }

    // Define the number of posts to show per page
    const perPage = 2;

    // Fetch the total count of posts in the database
    const totalPosts = await Post.find().countDocuments();

    // Fetch posts from the database with pagination and populate the 'creator' field
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");

    // Respond with the fetched posts and total count
    return {
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },

  // Function to fetch a single post by ID
  post: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    // Find the post by ID and populate the 'creator' field
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }
    // Respond with the fetched post data
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  // Function to update an existing post
  updatePost: async function ({ id, postInput }, req) {
    if (!req.isAuth) {
      // Check if the user is authenticated
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    // Find the post by ID and populate the 'creator' field
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }

    // Check if the logged-in user is the creator of the post
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }

    // Validate post input (title and content)
    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Title is invalid." });
    }
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid." });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // Update the post data with the provided input
    post.title = postInput.title;
    post.content = postInput.content;
    // If the image URL is provided, update the image URL
    if (postInput.imageUrl !== "undefined") {
      post.imageUrl = postInput.imageUrl;
    }
    // Save the updated post to the database
    const updatedPost = await post.save();

    // Respond with the updated post data
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },

  // Function to delete an existing post
  deletePost: async function ({ id }, req) {
    // Check if the user is authenticated
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    // Find the post by ID
    const post = await Post.findById(id);
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }

    // Check if the logged-in user is the creator of the post
    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    // Remove the post image from the server
    clearImage(post.imageUrl);

    // Delete the post from the database and remove the post reference from the user
    await Post.findByIdAndRemove(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    // Respond with a boolean indicating successful deletion
    return true;
  },

  // Function to fetch user data by ID
  user: async function (args, req) {
    // Check if the user is authenticated
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    // Find the user by ID
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No user found!");
      error.code = 404;
      throw error;
    }

    // Respond with the user data
    return { ...user._doc, _id: user._id.toString() };
  },

  // Function to update user status
  updateStatus: async function ({ status }, req) {
    // Check if the user is authenticated
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    // Find the user by ID
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No user found!");
      error.code = 404;
      throw error;
    }

    // Update the user status with the provided input
    user.status = status;
    await user.save();

    // Respond with the updated user data
    return { ...user._doc, _id: user._id.toString() };
  },
};
