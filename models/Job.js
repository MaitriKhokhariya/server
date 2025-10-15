const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },  
  externalId: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  category: String,
  location: String,
  url: String,
  feedUrl: String,
  company: String,
  jobType: String,
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);