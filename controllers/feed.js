// Import required modules and models

const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");

const io = require("../socket");
const Post = require("../models/post");
const User = require("../models/user");

// Function to fetch paginated posts from the database
exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  try {
    // Get the total count of posts
    const totalItems = await Post.find().countDocuments();

    // Fetch posts from the database with pagination and populate the 'creator' field
    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    // Respond with paginated posts and total count
    res.status(200).json({
      message: "Fetched posts successfully.",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    // Handle errors and pass them to the next middleware
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Function to create a new post
exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error("No image provided.");
    error.statusCode = 422;
    throw error;
  }
  const imageUrl = req.file.path;
  const title = req.body.title;
  const content = req.body.content;
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  });
  try {
    // Save the new post to the database and associate it with the creator
    await post.save();
    const user = await User.findById(req.userId);
    user.posts.push(post);
    await user.save();

    // Emit a socket.io event to inform clients about the new post
    io.getIO().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });
    // Respond with a success message and the new post details
    res.status(201).json({
      message: "Post created successfully!",
      post: post,
      creator: { _id: user._id, name: user.name },
    });
  } catch (err) {
    // Handle errors and pass them to the next middleware
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Function to fetch a single post by ID
exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  // Find the post by ID in the database
  const post = await Post.findById(postId);
  try {
    // If the post is not found, throw an error with status code 404 (Not Found)
    if (!post) {
      const error = new Error("Could not find post.");
      error.statusCode = 404;
      throw error;
    }
    // Respond with the fetched post
    res.status(200).json({ message: "Post fetched.", post: post });
  } catch (err) {
    // Handle errors and pass them to the next middleware
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Function to update an existing post
exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path;
  }
  if (!imageUrl) {
    const error = new Error("No file picked.");
    error.statusCode = 422;
    throw error;
  }
  try {
    // Find the post by ID in the database and populate the 'creator' field
    const post = await Post.findById(postId).populate("creator");

    // If the post is not found, throw an error with status code 404 (Not Found)
    if (!post) {
      const error = new Error("Could not find post.");
      error.statusCode = 404;
      throw error;
    }

    // Check if the logged-in user is the creator of the post
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Not authorized!");
      error.statusCode = 403;
      throw error;
    }

    // If the image URL has changed, remove the old image from the server
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }

    // Update the post fields and save the changes to the database
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const result = await post.save();

    // Emit a socket.io event to inform clients about the updated post
    io.getIO().emit("posts", { action: "update", post: result });

    // Respond with a success message and the updated post details
    res.status(200).json({ message: "Post updated!", post: result });
  } catch (err) {
    // Handle errors and pass them to the next middleware
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Function to delete an existing post
exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    // Find the post by ID in the database
    const post = await Post.findById(postId);

    // If the post is not found, throw an error with status code 404 (Not Found)
    if (!post) {
      const error = new Error("Could not find post.");
      error.statusCode = 404;
      throw error;
    }

    // Check if the logged-in user is the creator of the post
    if (post.creator.toString() !== req.userId) {
      const error = new Error("Not authorized!");
      error.statusCode = 403;
      throw error;
    }

    // Remove the post image from the server
    clearImage(post.imageUrl);
    // Delete the post from the database and remove the post reference from the user
    await Post.findByIdAndRemove(postId);

    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();

    // Emit a socket.io event to inform clients about the deleted post
    io.getIO().emit("posts", { action: "delete", post: postId });
    // Respond with a success message
    res.status(200).json({ message: "Deleted post." });
  } catch (err) {
    // Handle errors and pass them to the next middleware
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Function to remove an image from the server
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
