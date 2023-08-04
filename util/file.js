const path = require("path");
const fs = require("fs");

// Function to delete an image file from the server file system
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  // The 'unlink' function removes the file from the file system
  fs.unlink(filePath, (err) => console.log(err));
};

exports.clearImage = clearImage;
