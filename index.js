require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const Queue = require('./queue');

const app = express();
app.use(cors());
app.use(express.json());

let ImportLog;
 
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected');
 
    ImportLog = require('./models/ImportLog');

    const fetcher = require('./fetcher');
    cron.schedule('0 * * * *', fetcher.fetchAllFeeds); 
    fetcher.fetchAllFeeds();  

    require('./worker'); 
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);  
  }
}


app.get('/api/import-history', async (req, res) => {
  try {
    if (!ImportLog) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    const logs = await ImportLog.find().sort({ timestamp: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});
 
const PORT = process.env.PORT || 3001;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});