const jobQueue = require('./queue');
const Job = require('./models/Job');
const ImportLog = require('./models/ImportLog');

const CONCURRENCY = 5;

jobQueue.process('import-job', CONCURRENCY, async (jobData) => {
  const { feedUrl, jobs } = jobData.data;
  let newJobs = 0, updatedJobs = 0, failedJobs = [], totalImported = 0;

  for (const rawJob of jobs) {
    try {
      const id = `${rawJob.externalId}-${feedUrl}`;
      const existing = await Job.findOne({ id });

      const jobDoc = new Job({
        id,
        ...rawJob,
        updatedAt: new Date()
      });

      if (existing) {
        await Job.findByIdAndUpdate(existing._id, jobDoc);
        updatedJobs++;
      } else {
        await jobDoc.save();
        newJobs++;
      }
      totalImported++;
    } catch (err) {
      failedJobs.push({ reason: err.message, jobData: rawJob });
      console.error(`Failed to import job from ${feedUrl}:`, err.message);
    }
  }

  // Log the run
  const log = new ImportLog({
    feedUrl,
    totalFetched: jobs.length,
    totalImported,
    newJobs,
    updatedJobs,
    failedJobs
  });
  await log.save();

  console.log(`Processed ${jobs.length} jobs from ${feedUrl}: ${newJobs} new, ${updatedJobs} updated, ${failedJobs.length} failed`);
});

// Handle job failures
jobQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});