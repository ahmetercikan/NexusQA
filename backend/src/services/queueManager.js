/**
 * Test Execution Queue Manager
 *
 * Manages distributed test execution with priority, resource allocation,
 * and intelligent scheduling
 *
 * Nexus QA - Cloud Execution
 */

import EventEmitter from 'events';

class TestQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.running = [];
    this.completed = [];
    this.failed = [];
    this.maxConcurrent = 5; // Default parallel sessions
    this.processing = false;
  }

  /**
   * Add test to queue
   */
  enqueue(testJob) {
    const job = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...testJob,
      status: 'queued',
      priority: testJob.priority || 0,
      enqueuedAt: new Date(),
      estimatedDuration: testJob.estimatedDuration || 120, // seconds
      retries: 0,
      maxRetries: testJob.maxRetries || 2
    };

    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(q => q.priority < job.priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    this.emit('job:enqueued', job);
    console.log(`[Queue] Job ${job.id} enqueued with priority ${job.priority}`);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return job.id;
  }

  /**
   * Process queue - execute tests up to maxConcurrent limit
   */
  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 || this.running.length > 0) {
      // Execute tests while under concurrent limit
      while (this.running.length < this.maxConcurrent && this.queue.length > 0) {
        const job = this.queue.shift();
        await this.executeJob(job);
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.processing = false;
    this.emit('queue:empty');
    console.log('[Queue] All jobs completed');
  }

  /**
   * Execute a single test job
   */
  async executeJob(job) {
    job.status = 'running';
    job.startedAt = new Date();
    this.running.push(job);

    this.emit('job:started', job);
    console.log(`[Queue] Starting job ${job.id} (${this.running.length}/${this.maxConcurrent} running)`);

    try {
      // Execute the test function
      const result = await job.execute();

      job.status = 'completed';
      job.completedAt = new Date();
      job.duration = (job.completedAt - job.startedAt) / 1000; // seconds
      job.result = result;

      this.running = this.running.filter(j => j.id !== job.id);
      this.completed.push(job);

      this.emit('job:completed', job);
      console.log(`[Queue] Job ${job.id} completed in ${job.duration}s`);
    } catch (error) {
      console.error(`[Queue] Job ${job.id} failed:`, error.message);

      // Retry logic
      if (job.retries < job.maxRetries) {
        job.retries++;
        job.status = 'retrying';
        console.log(`[Queue] Retrying job ${job.id} (attempt ${job.retries}/${job.maxRetries})`);

        // Re-enqueue with higher priority
        job.priority += 10;
        this.queue.unshift(job);

        this.emit('job:retry', job);
      } else {
        job.status = 'failed';
        job.completedAt = new Date();
        job.error = error.message;
        job.stack = error.stack;

        this.running = this.running.filter(j => j.id !== job.id);
        this.failed.push(job);

        this.emit('job:failed', job);
      }
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const totalJobs = this.queue.length + this.running.length + this.completed.length + this.failed.length;
    const successRate = totalJobs > 0 ? (this.completed.length / totalJobs) * 100 : 0;

    const avgDuration = this.completed.length > 0
      ? this.completed.reduce((sum, j) => sum + j.duration, 0) / this.completed.length
      : 0;

    const estimatedWaitTime = this.queue.reduce((sum, j) => sum + j.estimatedDuration, 0) / this.maxConcurrent;

    return {
      queued: this.queue.length,
      running: this.running.length,
      completed: this.completed.length,
      failed: this.failed.length,
      total: totalJobs,
      successRate: successRate.toFixed(2),
      avgDuration: avgDuration.toFixed(2),
      estimatedWaitTime: estimatedWaitTime.toFixed(0),
      maxConcurrent: this.maxConcurrent,
      utilization: ((this.running.length / this.maxConcurrent) * 100).toFixed(2)
    };
  }

  /**
   * Get job by ID
   */
  getJob(jobId) {
    return (
      this.queue.find(j => j.id === jobId) ||
      this.running.find(j => j.id === jobId) ||
      this.completed.find(j => j.id === jobId) ||
      this.failed.find(j => j.id === jobId)
    );
  }

  /**
   * Cancel job
   */
  cancelJob(jobId) {
    const jobIndex = this.queue.findIndex(j => j.id === jobId);
    if (jobIndex !== -1) {
      const job = this.queue.splice(jobIndex, 1)[0];
      job.status = 'cancelled';
      job.completedAt = new Date();
      this.failed.push(job);

      this.emit('job:cancelled', job);
      console.log(`[Queue] Job ${jobId} cancelled`);
      return true;
    }

    // Can't cancel running jobs (would need to implement job abortion)
    console.log(`[Queue] Job ${jobId} not found or already running`);
    return false;
  }

  /**
   * Set max concurrent sessions
   */
  setMaxConcurrent(max) {
    this.maxConcurrent = max;
    console.log(`[Queue] Max concurrent sessions set to ${max}`);

    // Trigger processing if queue has items
    if (this.queue.length > 0 && !this.processing) {
      this.processQueue();
    }
  }

  /**
   * Clear completed jobs (cleanup)
   */
  clearCompleted() {
    const count = this.completed.length;
    this.completed = [];
    console.log(`[Queue] Cleared ${count} completed jobs`);
    return count;
  }

  /**
   * Get all jobs
   */
  getAllJobs() {
    return {
      queued: this.queue,
      running: this.running,
      completed: this.completed,
      failed: this.failed
    };
  }
}

// Singleton instance
const queueManager = new TestQueue();

/**
 * Create a test execution job
 */
export function createTestJob(options) {
  const {
    testFile,
    browser = 'chromium',
    provider = 'local',
    projectId,
    priority = 0,
    estimatedDuration = 120,
    execute
  } = options;

  return {
    testFile,
    browser,
    provider,
    projectId,
    priority,
    estimatedDuration,
    execute: execute || (() => {
      throw new Error('Execute function not provided');
    })
  };
}

/**
 * Schedule test execution
 */
export async function scheduleTest(testJob) {
  return queueManager.enqueue(testJob);
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  return queueManager.getStats();
}

/**
 * Get job status
 */
export function getJobStatus(jobId) {
  const job = queueManager.getJob(jobId);
  if (!job) {
    return { found: false };
  }

  return {
    found: true,
    id: job.id,
    status: job.status,
    priority: job.priority,
    enqueuedAt: job.enqueuedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    duration: job.duration,
    retries: job.retries,
    result: job.result,
    error: job.error
  };
}

/**
 * Cancel test execution
 */
export function cancelTest(jobId) {
  return queueManager.cancelJob(jobId);
}

/**
 * Set parallel execution limit
 */
export function setParallelLimit(limit) {
  return queueManager.setMaxConcurrent(limit);
}

/**
 * Subscribe to queue events
 */
export function subscribeToQueueEvents(callback) {
  const events = ['job:enqueued', 'job:started', 'job:completed', 'job:failed', 'job:retry', 'job:cancelled', 'queue:empty'];

  events.forEach(event => {
    queueManager.on(event, (data) => {
      callback({ event, data });
    });
  });

  return () => {
    events.forEach(event => {
      queueManager.removeAllListeners(event);
    });
  };
}

/**
 * Get all jobs in queue
 */
export function getAllQueuedJobs() {
  return queueManager.getAllJobs();
}

/**
 * Clear completed jobs
 */
export function clearCompletedJobs() {
  return queueManager.clearCompleted();
}

export default queueManager;
