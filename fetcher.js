// const axios = require('axios');
// const xml2js = require('xml2js');
// const Queue = require('./queue');

// const feeds = require('./config/feeds');
// const BATCH_SIZE = 50;

// async function parseXmlToJobs(xmlData, feedUrl) {
//   return new Promise((resolve, reject) => {
//     xml2js.parseString(xmlData, (err, result) => {
//       if (err) return reject(err);
//       // Assume structure like { rss: { channel: { item: [{ title, description, ... }] } } } or similar for Jobicy
//       // Adapt based on real XML: For RSS, items = result.rss.channel[0].item
//       // For Jobicy (custom XML), assume { jobs: { job: [...] } }
//       let items = [];
//       if (result.rss) {
//         items = result.rss.channel[0].item || [];
//       } else if (result.jobs) {
//         items = result.jobs.job || [];
//       }
//       const jobs = items.map(item => ({
//         externalId: item.guid?.[0] || item.link?.[0] || Math.random().toString(),
//         title: item.title?.[0] || '',
//         description: item.description?.[0] || '',
//         category: item.category?.[0] || 'general',
//         location: item.location?.[0] || '',
//         url: item.link?.[0] || '',
//         feedUrl
//       })).filter(job => job.title); // Basic validation
//       resolve(jobs);
//     });
//   });
// }

// async function fetchFeed(feed) {
//   try {
//     console.log(`Fetching ${feed.name}: ${feed.url}`);
//     const { data: xmlData } = await axios.get(feed.url);
//     const jobs = await parseXmlToJobs(xmlData, feed.url);
//     console.log(`Fetched ${jobs.length} jobs from ${feed.name}`);

//     // Enqueue in batches
//     for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
//       const batch = jobs.slice(i, i + BATCH_SIZE);
//       await Queue.add('import-job', { feedUrl: feed.url, jobs: batch });
//     }
//   } catch (err) {
//     console.error(`Error fetching ${feed.name}:`, err.message);
//   }
// }

// async function fetchAllFeeds() {
//   for (const feed of feeds) {
//     await fetchFeed(feed);
//   }
// }

// module.exports = { fetchAllFeeds };








// const axios = require('axios');
// const xml2js = require('xml2js');
// const Queue = require('./queue');

// const feeds = require('./config/feeds');
// const BATCH_SIZE = 50;

// // Helper to extract category from URL (e.g., job_categories=smm)
// function extractCategory(url) {
//   const match = url.match(/job_categories=([^&]+)/);
//   return match ? match[1] : 'general';
// }

// async function parseXmlToJobs(xmlData, feedUrl) {
//   return new Promise((resolve, reject) => {
//     xml2js.parseString(xmlData, { explicitArray: false }, (err, result) => {  // explicitArray: false for simpler objects
//       if (err) return reject(err);
//       // Handle RSS structure
//       let items = [];
//       if (result.rss && result.rss.channel && result.rss.channel.item) {
//         items = Array.isArray(result.rss.channel.item) ? result.rss.channel.item : [result.rss.channel.item];
//       } else if (result.jobs && result.jobs.job) {
//         items = Array.isArray(result.jobs.job) ? result.jobs.job : [result.jobs.job];
//       }
      
//       const category = extractCategory(feedUrl);
//       const jobs = items.map(item => {
//         const externalId = item.id || item.guid?._ || Math.random().toString(36);
//         return {
//           externalId: String(externalId),  // Ensure string
//           title: item.title || '',
//           description: item['content:encoded']?._ || item.description || '',  // Full HTML desc preferred
//           category,
//           location: item['job_listing:location'] || '',
//           url: item.link || item.guid?._ || '',
//           feedUrl,
//           company: item['job_listing:company'] || '',
//           jobType: item['job_listing:job_type'] || 'Full Time'  // Default from feed
//         };
//       }).filter(job => job.title && job.externalId);  // Skip invalid
//       resolve(jobs);
//     });
//   });
// }

// async function fetchFeed(feed) {
//   try {
//     console.log(`Fetching ${feed.name}: ${feed.url}`);
//     const { data: xmlData } = await axios.get(feed.url, { timeout: 10000 });
//     const jobs = await parseXmlToJobs(xmlData, feed.url);
//     console.log(`Fetched ${jobs.length} jobs from ${feed.name}`);

//     // Enqueue in batches
//     for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
//       const batch = jobs.slice(i, i + BATCH_SIZE);
//       await Queue.add('import-job', { feedUrl: feed.url, jobs: batch });
//     }
//   } catch (err) {
//     console.error(`Error fetching ${feed.name}:`, err.message);
//   }
// }

// async function fetchAllFeeds() {
//   for (const feed of feeds) {
//     await fetchFeed(feed);
//   }
// }

// module.exports = { fetchAllFeeds }; 







// const axios = require('axios');
// const xml2js = require('xml2js');
// const Queue = require('./queue');

// const feeds = require('./config/feeds');
// const BATCH_SIZE = 50;

// // Helper to extract category from URL (e.g., job_categories=smm)
// function extractCategory(url) {
//   const match = url.match(/job_categories=([^&]+)/);
//   return match ? match[1] : 'general';
// }

// // Escape ONLY unescaped & in XML text (not entities like &lt;)
// function escapeXml(xmlData) {
//   const str = xmlData.toString().trim();  // Trim whitespace/BOM
//   return str.replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;');  // Targeted: & not followed by valid entity
// }

// async function parseXmlToJobs(xmlData, feedUrl) {
//   return new Promise((resolve, reject) => {
//     // Escape & first
//     const escapedXml = escapeXml(xmlData);
    
//     // DEBUG: Log around error column and full length
//     console.log(`[DEBUG] Feed: ${feedUrl}`);
//     console.log(`[DEBUG] XML length: ${escapedXml.length}`);
//     if (escapedXml.length > 300) {
//       console.log(`[DEBUG] Snippet around col 300-400: ${escapedXml.substring(300, 400)}`);
//     }
    
//     xml2js.parseString(escapedXml, { explicitArray: false }, (err, result) => {
//       if (err) {
//         console.error(`[DEBUG] Parse error details: ${err.message}`);
//         console.error(`[DEBUG] Error snippet: ${escapedXml.substring(Math.max(0, err.column - 10), err.column + 10)}`);
//         return reject(err);
//       }
//       // Handle RSS structure
//       let items = [];
//       if (result.rss && result.rss.channel && result.rss.channel.item) {
//         items = Array.isArray(result.rss.channel.item) ? result.rss.channel.item : [result.rss.channel.item];
//       } else if (result.jobs && result.jobs.job) {
//         items = Array.isArray(result.jobs.job) ? result.jobs.job : [result.jobs.job];
//       }
      
//       const category = extractCategory(feedUrl);
//       const jobs = items.map(item => {
//         const externalId = item.id || item.guid || Math.random().toString(36);
//         return {
//           externalId: String(externalId),
//           title: item.title || '',
//           description: item['content:encoded']?._ || item.description || '',
//           category,
//           location: item['job_listing:location'] || '',
//           url: item.link || item.guid || '',
//           feedUrl,
//           company: item['job_listing:company'] || item.author || '',
//           jobType: item['job_listing:job_type'] || 'Article'
//         };
//       }).filter(job => job.title && job.externalId);
//       resolve(jobs);
//     });
//   });
// }

// async function fetchFeed(feed) {
//   try {
//     console.log(`Fetching ${feed.name}: ${feed.url}`);
//     const response = await axios.get(feed.url, { 
//       timeout: 10000,
//       headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobImporter/1.0)' }  // Add UA to avoid blocks
//     });
//     const xmlData = response.data;
//     const jobs = await parseXmlToJobs(xmlData, feed.url);
//     console.log(`Fetched ${jobs.length} jobs from ${feed.name}`);

//     // Enqueue in batches
//     for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
//       const batch = jobs.slice(i, i + BATCH_SIZE);
//       await Queue.add('import-job', { feedUrl: feed.url, jobs: batch });
//     }
//   } catch (err) {
//     console.error(`Error fetching ${feed.name}:`, err.message);
//     // If parse error, don't crash whole run
//     if (err.message.includes('ParseError')) {
//       console.log(`[SKIP] Skipping malformed feed: ${feed.url}`);
//     }
//   }
// }

// async function fetchAllFeeds() {
//   for (const feed of feeds) {
//     await fetchFeed(feed);
//   }
// }

// module.exports = { fetchAllFeeds };







































const axios = require('axios');
const xml2js = require('xml2js');
const Queue = require('./queue');
const feeds = require('./config/feeds');
const ImportLog = require('./models/ImportLog');

const BATCH_SIZE = 50;

function extractCategory(url) {
  const match = url.match(/job_categories=([^&]+)/);
  return match ? match[1] : 'general';
}

function escapeXml(xmlData) {
  const str = xmlData.toString().trim();
  return str.replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;');
}

async function parseXmlToJobs(xmlData, feedUrl) {
  return new Promise((resolve, reject) => {
    const escapedXml = escapeXml(xmlData);
    xml2js.parseString(escapedXml, { explicitArray: false }, (err, result) => {
      if (err) {
        return reject(new Error(`XML ParseError: ${err.message} (${feedUrl})`));
      }

      let items = [];
      if (result.rss?.channel?.item) {
        items = Array.isArray(result.rss.channel.item)
          ? result.rss.channel.item
          : [result.rss.channel.item];
      } else if (result.jobs?.job) {
        items = Array.isArray(result.jobs.job)
          ? result.jobs.job
          : [result.jobs.job];
      } else {
        return reject(new Error(`Invalid RSS structure in feed: ${feedUrl}`));
      }

      const category = extractCategory(feedUrl);
      const jobs = items.map(item => ({
        externalId: String(item.id || item.guid || Math.random().toString(36)),
        title: item.title || '',
        description: item['content:encoded']?._ || item.description || '',
        category,
        location: item['job_listing:location'] || '',
        url: item.link || '',
        feedUrl,
        company: item['job_listing:company'] || item.author || '',
        jobType: item['job_listing:job_type'] || 'General'
      })).filter(job => job.title && job.externalId);

      resolve(jobs);
    });
  });
}

async function fetchFeed(feed) {
  let totalFetched = 0;
  let totalImported = 0;
  let failedJobs = [];

  try {
    console.log(`Fetching ${feed.name}: ${feed.url}`);

    const response = await axios.get(feed.url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobImporter/1.0)' },
    });

    const xmlData = response.data;
    const jobs = await parseXmlToJobs(xmlData, feed.url);
    totalFetched = jobs.length;

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      await Queue.add('import-job', { feedUrl: feed.url, jobs: batch });
    }

    totalImported = jobs.length;
    console.log(`✅ Imported ${totalImported} jobs from ${feed.name}`);

  } catch (err) {
    console.error(`❌ Error fetching ${feed.name}:`, err.message);
    failedJobs.push({
      reason: err.message,
      jobData: { feed: feed.name, url: feed.url },
    });
  }

  await ImportLog.create({
    feedUrl: feed.url,
    totalFetched,
    totalImported,
    newJobs: 0,
    updatedJobs: 0,
    failedJobs,
  });
}

async function fetchAllFeeds() {
  for (const feed of feeds) {
    await fetchFeed(feed);
  }
}

module.exports = { fetchAllFeeds };
