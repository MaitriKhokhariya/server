const Queue = require('bull');
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const jobQueue = new Queue('job-import', redisUrl);

module.exports = jobQueue;