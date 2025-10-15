// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const cron = require('node-cron');
// const Queue = require('./queue'); // We'll create this

// const app = express();
// app.use(cors());
// app.use(express.json());

// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => console.error('MongoDB error:', err));

// // API Routes
// app.get('/api/import-history', async (req, res) => {
//   const ImportLog = require('./models/ImportLog');
//   const logs = await ImportLog.find().sort({ timestamp: -1 }).limit(50);
//   res.json(logs);
// });

// // Start cron fetcher
// const fetcher = require('./fetcher');
// cron.schedule('0 * * * *', fetcher.fetchAllFeeds); // Every hour
// // cron.schedule('*/15 * * * * *', fetcher.fetchAllFeeds);  // for 15 sec
// fetcher.fetchAllFeeds(); // Run once on start

// // Start workers
// require('./worker');

// app.listen(process.env.PORT || 3001, () => {
//   console.log(`Server running on port ${process.env.PORT || 3001}`);
// });






require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const Queue = require('./queue'); // We'll create this

const app = express();
app.use(cors());
app.use(express.json());

let ImportLog; // Will be initialized after connection

// Connection function
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Faster timeout for selection
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    console.log('MongoDB connected');

    // Now require the model AFTER connection (safe now)
    ImportLog = require('./models/ImportLog');

    // Start cron fetcher and workers AFTER connection and model init
    const fetcher = require('./fetcher');
    cron.schedule('0 * * * *', fetcher.fetchAllFeeds); // Every hour
    // cron.schedule('*/15 * * * * *', fetcher.fetchAllFeeds);  // for 15 sec testing
    fetcher.fetchAllFeeds(); // Run once on start

    require('./worker'); // Start workers
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if connection fails
  }
}

// API Routes (now safe to use after connection)
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

// Listen only after connection
const PORT = process.env.PORT || 3001;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});