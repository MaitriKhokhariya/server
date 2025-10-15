const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  feedUrl: { type: String, required: true },
  totalFetched: Number,
  totalImported: Number,
  newJobs: Number,
  updatedJobs: Number,
  failedJobs: [{ reason: String, jobData: Object }]
});

module.exports = mongoose.model('ImportLog', importLogSchema);