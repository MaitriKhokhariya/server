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
    console.log(` Imported ${totalImported} jobs from ${feed.name}`);

  } catch (err) {
    console.error(` Error fetching ${feed.name}:`, err.message);
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
