const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true, // E.g., 'building-node-gateway'
  },
  excerpt: {
    type: String,
    required: true, // Short description for the homepage cards
  },
  content: {
    type: String,
    required: true, // The full markdown/HTML body
  },
  category: {
    type: String,
    enum: ['life', 'technical', 'project'], // Strictly enforces these 3 types
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Post', postSchema);
