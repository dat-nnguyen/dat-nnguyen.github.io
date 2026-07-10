const mongoose = require('mongoose');
//define schema for database
const articleSchema = new mongoose.Schema({
  title: {
    type : String,
    required : true
  },

  slug: {
    type : String,
    required : true,
    unique : true // two articles cannot have the same URL
  },

  content: {
    type : String,
    required : true
  },

  tags: {
    type: [String],
    default: []
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Article', articleSchema); // export model to be used in other files