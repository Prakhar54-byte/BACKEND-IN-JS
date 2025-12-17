import videoProcessingQueue from './queues/videoProcessing.queue.js';

async function checkQueue() {
    const counts = await videoProcessingQueue.getJobCounts('wait', 'completed', 'failed');
    console.log('Job counts:', counts);

    const jobs = await videoProcessingQueue.getJobs(['wait', 'completed', 'failed']);
    if (jobs.length > 0) {
        console.log('Jobs:');
        jobs.forEach(job => {
            console.log(`  - Job ${job.id}: ${job.name}, status: ${job.getState()}`);
            if (job.failedReason) {
                console.log(`    Failed reason: ${job.failedReason}`);
            }
        });
    } else {
        console.log('No jobs in the queue.');
    }

    await videoProcessingQueue.close();
}

checkQueue();
