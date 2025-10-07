---
sidebar_position: 10
---

# Scheduled Jobs

Scheduled jobs allow you to run background tasks at specified intervals using cron-like schedules.

## Creating Jobs

Create a `*.job.ts` file in the `src/jobs/` directory. Each job file must export a `Job` object with a `schedule` array and a `runJob` function.

```typescript title="src/jobs/cleanup.job.ts"
import { Job } from '@peaque/framework';

export const job: Job = {
  schedule: ['0 0 * * *'], // Daily at midnight
  runJob: async () => {
    console.log('Running cleanup job...');
    // Your job logic here
    // e.g., clean up old files, update database, etc.
  }
};
```

## Job Interface

```typescript
interface Job {
  schedule: string[]; // Array of cron schedule strings
  runJob(): Promise<void>;
}
```

## Cron Scheduling

Jobs use cron expressions to define when they should run. Cron expressions consist of 5 fields:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, Sunday = 0 or 7)
│ │ │ └─── Month (1-12)
│ │ └─── Day of month (1-31)
│ └───── Hour (0-23)
└─────── Minute (0-59)
```

### Examples

- `'0 0 * * *'` - Daily at midnight
- `'*/15 * * * *'` - Every 15 minutes
- `'0 9 * * 1'` - Every Monday at 9:00 AM
- `'0 0 1 * *'` - First day of every month at midnight

## Multiple Schedules

You can specify multiple schedules for a single job:

```typescript title="src/jobs/backup.job.ts"
import { Job } from '@peaque/framework';

export const job: Job = {
  schedule: [
    '0 2 * * *',  // Daily at 2:00 AM
    '0 14 * * *'  // Daily at 2:00 PM
  ],
  runJob: async () => {
    console.log('Running backup job...');
    // Backup logic here
  }
};
```

## Job Execution

Jobs run automatically based on their schedules. The framework handles:

- Loading and scheduling jobs on startup
- Reloading jobs when files change (in development)
- Error handling and logging
- Preventing overlapping executions

## Error Handling

Wrap your job logic in try-catch blocks for proper error handling:

```typescript title="src/jobs/email.job.ts"
import { Job } from '@peaque/framework';

export const job: Job = {
  schedule: ['0 */2 * * *'], // Every 2 hours
  runJob: async () => {
    try {
      console.log('Sending scheduled emails...');
      // Email sending logic
    } catch (error) {
      console.error('Error in email job:', error);
      // Handle error (e.g., log to monitoring service)
    }
  }
};
```

## Best Practices

- Keep jobs lightweight and focused on a single task
- Use descriptive names for job files (e.g., `cleanup.job.ts`, `backup.job.ts`)
- Log important events within your job
- Handle errors gracefully to prevent job failures
- Test jobs thoroughly before deploying
- Consider the impact on system resources when scheduling frequent jobs
