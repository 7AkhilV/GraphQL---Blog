const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User", // Refers to the 'User' model, establishing a relationship between 'Post' and 'User'
      required: true,
    },
  },
  { timestamps: true } // Adds "createdAt" and "updatedAt" fields automatically to track document creation and updates
);

module.exports = mongoose.model("Post", postSchema);
