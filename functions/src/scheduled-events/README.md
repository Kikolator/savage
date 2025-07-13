# Scheduled Events

This module contains time-based automated functions that run on a schedule using Cloud Scheduler.

## 📁 Structure

```
scheduled-events/
├── on-schedule-events/    # Scheduled function implementations
│   ├── office-rnd-scheduled-events.ts    # OfficeRnd sync
│   ├── reward-scheduled-events.ts        # Reward processing
│   └── sendgrid-scheduled-events.ts      # Email campaigns
├── index.ts               # Scheduled function exports
└── initialize-scheduled-events.ts        # Function initialization
```

## 🚀 Quick Start

### Scheduled Functions

#### OfficeRnd Synchronization
- **officeRndSync**: Daily sync with OfficeRnd API
- **Schedule**: Daily at 2:00 AM UTC

#### Reward Processing
- **processDueRewards**: Process pending rewards
- **Schedule**: Daily at 9:00 AM UTC

#### Email Campaigns
- **trialdayFollowup**: Send trial day follow-up emails
- **Schedule**: Daily at 10:00 AM UTC

### Usage
```typescript
import {onSchedule} from 'firebase-functions/v2/scheduler';

export const processDueRewards = onSchedule(
  {
    schedule: '0 9 * * *', // Daily at 9 AM
    timeZone: 'Europe/Amsterdam'
  },
  async (event) => {
    await processRewards();
  }
);
```

## 🔧 Scheduled Function Patterns

### **Basic Scheduled Function**
Simple scheduled function with error handling:

```typescript
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {STATIC_CONFIG} from '../core/config';

export const myScheduledFunction = onSchedule(
  {
    schedule: '0 2 * * *', // Daily at 2 AM
    timeZone: STATIC_CONFIG.timezone,
    region: STATIC_CONFIG.region
  },
  async (event) => {
    console.log('Starting scheduled function:', event.jobName);
    
    try {
      await performScheduledTask();
      console.log('Scheduled function completed successfully');
    } catch (error) {
      console.error('Scheduled function failed:', error);
      throw error; // Re-throw to mark as failed
    }
  }
);
```

### **Service-Based Scheduled Functions**
Use dependency injection for business logic:

```typescript
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {container} from '../core/services/di/container';

export const processRewards = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'Europe/Amsterdam'
  },
  async (event) => {
    const rewardService = container.get('rewardService');
    const firestoreService = container.get('firestoreService');
    
    try {
      // Get pending rewards
      const pendingRewards = await firestoreService.getPendingRewards();
      
      // Process each reward
      for (const reward of pendingRewards) {
        await rewardService.processReward(reward);
      }
      
      console.log(`Processed ${pendingRewards.length} rewards`);
    } catch (error) {
      console.error('Failed to process rewards:', error);
      throw error;
    }
  }
);
```

### **Batch Processing**
Handle large datasets in batches:

```typescript
export const syncOfficeRndData = onSchedule(
  {
    schedule: '0 2 * * *',
    timeZone: 'Europe/Amsterdam'
  },
  async (event) => {
    const officeRndService = container.get('officeRndService');
    const batchSize = 100;
    let processed = 0;
    
    try {
      // Get all members from OfficeRnd
      const members = await officeRndService.getAllMembers();
      
      // Process in batches
      for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize);
        await officeRndService.syncMembers(batch);
        processed += batch.length;
        
        console.log(`Processed ${processed}/${members.length} members`);
      }
      
      console.log('OfficeRnd sync completed successfully');
    } catch (error) {
      console.error('OfficeRnd sync failed:', error);
      throw error;
    }
  }
);
```

## ⏰ Scheduling Patterns

### **Cron Expressions**
Common scheduling patterns:

```typescript
// Daily at specific time
schedule: '0 9 * * *'        // 9:00 AM daily
schedule: '30 2 * * *'       // 2:30 AM daily

// Weekly on specific day
schedule: '0 10 * * 1'       // 10:00 AM every Monday
schedule: '0 15 * * 5'       // 3:00 PM every Friday

// Monthly on specific day
schedule: '0 8 1 * *'        // 8:00 AM on 1st of month
schedule: '0 12 15 * *'      // 12:00 PM on 15th of month

// Multiple times per day
schedule: '0 */6 * * *'      // Every 6 hours
schedule: '0 9,15,21 * * *'  // 9 AM, 3 PM, 9 PM daily
```

### **Timezone Configuration**
Use consistent timezone across functions:

```typescript
import {STATIC_CONFIG} from '../core/config';

export const scheduledFunction = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: STATIC_CONFIG.timezone, // 'Europe/Amsterdam'
    region: STATIC_CONFIG.region
  },
  async (event) => {
    // Function logic
  }
);
```

## 🔒 Error Handling & Retry Logic

### **Robust Error Handling**
Handle failures gracefully:

```typescript
export const resilientScheduledFunction = onSchedule(
  {
    schedule: '0 2 * * *',
    timeZone: 'Europe/Amsterdam'
  },
  async (event) => {
    const maxRetries = 3;
    let attempt = 1;
    
    while (attempt <= maxRetries) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}`);
        await performTask();
        console.log('Task completed successfully');
        return;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error('All retry attempts failed');
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      }
    }
  }
);
```

### **Partial Success Handling**
Handle partial failures in batch operations:

```typescript
export const batchProcessingFunction = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'Europe/Amsterdam'
  },
  async (event) => {
    const items = await getItemsToProcess();
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for (const item of items) {
      try {
        await processItem(item);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          itemId: item.id,
          error: error.message
        });
        console.error(`Failed to process item ${item.id}:`, error);
      }
    }
    
    console.log('Batch processing completed:', results);
    
    // Only throw if all items failed
    if (results.successful === 0 && results.failed > 0) {
      throw new Error('All items failed to process');
    }
  }
);
```

## 📊 Monitoring & Logging

### **Structured Logging**
Use structured logging for better monitoring:

```typescript
export const monitoredScheduledFunction = onSchedule(
  {
    schedule: '0 4 * * *',
    timeZone: 'Europe/Amsterdam'
  },
  async (event) => {
    const startTime = Date.now();
    const jobName = event.jobName;
    
    console.log('Starting scheduled job', {
      jobName,
      startTime: new Date(startTime).toISOString(),
      schedule: event.scheduleTime
    });
    
    try {
      const result = await performTask();
      
      console.log('Scheduled job completed successfully', {
        jobName,
        duration: Date.now() - startTime,
        result: result
      });
    } catch (error) {
      console.error('Scheduled job failed', {
        jobName,
        duration: Date.now() - startTime,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
);
```

### **Performance Metrics**
Track function performance:

```typescript
export const performanceTrackedFunction = onSchedule(
  {
    schedule: '0 5 * * *',
    timeZone: 'Europe/Amsterdam'
  },
  async (event) => {
    const metrics = {
      startTime: Date.now(),
      itemsProcessed: 0,
      errors: 0
    };
    
    try {
      const items = await getItemsToProcess();
      metrics.itemsProcessed = items.length;
      
      for (const item of items) {
        try {
          await processItem(item);
        } catch (error) {
          metrics.errors++;
          console.error('Item processing failed:', error);
        }
      }
      
      // Log performance metrics
      console.log('Performance metrics', {
        jobName: event.jobName,
        duration: Date.now() - metrics.startTime,
        itemsProcessed: metrics.itemsProcessed,
        errorRate: metrics.errors / metrics.itemsProcessed,
        successRate: (metrics.itemsProcessed - metrics.errors) / metrics.itemsProcessed
      });
    } catch (error) {
      console.error('Scheduled function failed:', error);
      throw error;
    }
  }
);
```

## 🧪 Testing

### **Unit Testing**
```typescript
describe('processRewards', () => {
  it('should process pending rewards', async () => {
    const mockRewardService = createMockRewardService();
    const mockFirestoreService = createMockFirestoreService();
    
    container.register('rewardService', () => mockRewardService);
    container.register('firestoreService', () => mockFirestoreService);
    
    const testRewards = createTestRewards(5);
    mockFirestoreService.getPendingRewards.mockResolvedValue(testRewards);
    
    await processRewards();
    
    expect(mockFirestoreService.getPendingRewards).toHaveBeenCalled();
    expect(mockRewardService.processReward).toHaveBeenCalledTimes(5);
  });
});
```

### **Integration Testing**
```typescript
describe('Scheduled Function Integration', () => {
  it('should run scheduled function', async () => {
    // Mock the scheduled event
    const event = {
      jobName: 'test-job',
      scheduleTime: new Date().toISOString()
    };
    
    await processRewards(event);
    
    // Verify side effects
    const processedRewards = await getProcessedRewards();
    expect(processedRewards.length).toBeGreaterThan(0);
  });
});
```

## 📚 Related Documentation

- **[OfficeRnd Integration](../docs/office-rnd.md)** - OfficeRnd sync guide
- **[Reward Processing](../docs/rewards.md)** - Reward calculation guide
- **[Email Campaigns](../docs/sendgrid.md)** - Email automation guide
- **[Cron Expressions](https://crontab.guru/)** - Cron expression builder

## 🔗 Key Files

- `on-schedule-events/office-rnd-scheduled-events.ts` - OfficeRnd sync functions
- `on-schedule-events/reward-scheduled-events.ts` - Reward processing functions
- `on-schedule-events/sendgrid-scheduled-events.ts` - Email campaign functions
- `initialize-scheduled-events.ts` - Function initialization
- `index.ts` - Scheduled function exports 