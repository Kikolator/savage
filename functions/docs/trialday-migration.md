# Trialday Migration Guide

## Overview

This guide explains how to safely migrate legacy opportunities and typeform submissions to create missing trialday documents without sending inappropriate emails to users.

## Problem Statement

Your `trialdayFollowup` scheduled function was failing because it encountered old opportunities in OfficeRnd that don't have corresponding trialday documents in Firestore. This happens because:

1. **Legacy Data**: Opportunities created before the trialday system was implemented
2. **Manual Creation**: Opportunities created directly in OfficeRnd without going through the trialday flow
3. **Data Migration Issues**: Opportunities that weren't properly migrated during system updates

## Solution Architecture

### 1. **Safe Migration Service**
The `TrialdayMigrationService` provides controlled migration with:
- **Email Control**: Option to disable email sending during migration
- **Dry Run Mode**: Test migrations without making changes
- **Batch Processing**: Handle large datasets safely
- **Error Handling**: Continue processing even if individual records fail

### 2. **Migration Options**
```typescript
interface MigrationOptions {
  sendEmails?: boolean;           // Default: false (safety first)
  createMissingTrialdays?: boolean; // Default: true
  dryRun?: boolean;               // Default: true (safety first)
  dateRange?: {startDate: Date; endDate: Date};
  opportunityIds?: string[];      // Specific opportunities to migrate
}
```

### 3. **Two Migration Types**

#### A. Legacy Opportunities Migration
Creates placeholder trialday documents for opportunities without them:
- Uses opportunity data from OfficeRnd
- Creates minimal trialday documents
- Marks as completed (since opportunity is already trialComplete)
- No emails sent

#### B. Typeform Submissions Migration
Reprocesses old typeform data to create trialday documents:
- Uses original typeform submission data
- Creates full trialday documents with real user data
- Option to disable email sending
- Handles duplicates gracefully

## Usage Examples

### 1. **Check Migration Status**
```typescript
// Call the function to see what needs migration
const status = await getMigrationStatus();
console.log(status.statistics);
// Output: {totalTrialdays: 150, totalOpportunities: 200, missingTrialdays: 50}
```

### 2. **Dry Run Legacy Opportunities Migration**
```typescript
// Test migration without making changes
const result = await migrateTrialdayData({
  type: 'legacy-opportunities',
  options: {
    dryRun: true,           // Don't create documents
    sendEmails: false,      // Don't send emails
    createMissingTrialdays: true
  }
});

console.log(result.result);
// Output: {totalOpportunities: 200, processedOpportunities: 200, createdTrialdays: 0, skippedOpportunities: 150, errors: []}
```

### 3. **Execute Legacy Opportunities Migration**
```typescript
// Actually create the missing trialday documents
const result = await migrateTrialdayData({
  type: 'legacy-opportunities',
  options: {
    dryRun: false,          // Create documents
    sendEmails: false,      // Still no emails
    createMissingTrialdays: true
  }
});

console.log(result.result);
// Output: {totalOpportunities: 200, processedOpportunities: 200, createdTrialdays: 50, skippedOpportunities: 150, errors: []}
```

### 4. **Migrate Specific Opportunities**
```typescript
// Migrate only specific opportunities
const result = await migrateTrialdayData({
  type: 'legacy-opportunities',
  options: {
    dryRun: false,
    sendEmails: false,
    opportunityIds: ['opp_123', 'opp_456', 'opp_789']
  }
});
```

### 5. **Migrate Typeform Submissions (No Emails)**
```typescript
// Reprocess old typeform data without sending emails
const result = await migrateTrialdayData({
  type: 'typeform-submissions',
  options: {
    dryRun: false,
    sendEmails: false        // Critical: No emails to old users
  },
  typeformData: [
    {
      eventId: 'old_event_1',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      // ... other typeform fields
    }
    // ... more submissions
  ]
});
```

### 6. **Migrate Typeform Submissions (With Emails)**
```typescript
// Only use this if you're sure about sending emails
const result = await migrateTrialdayData({
  type: 'typeform-submissions',
  options: {
    dryRun: false,
    sendEmails: true         // Be very careful with this!
  },
  typeformData: typeformSubmissions
});
```

## Safety Features

### 1. **Default Safety Settings**
- `sendEmails: false` - No emails sent by default
- `dryRun: true` - Test mode by default
- Comprehensive logging for audit trails

### 2. **Email Control**
- Mock email service when `sendEmails: false`
- Logs what emails would have been sent
- No risk of accidental email sending

### 3. **Duplicate Prevention**
- Checks for existing trialday documents
- Skips already processed records
- Safe to run multiple times

### 4. **Error Handling**
- Individual record failures don't stop the batch
- Detailed error reporting
- Graceful degradation

## Migration Strategy

### Phase 1: Assessment (Dry Run)
```typescript
// 1. Check current status
const status = await getMigrationStatus();

// 2. Dry run legacy opportunities
const legacyResult = await migrateTrialdayData({
  type: 'legacy-opportunities',
  options: {dryRun: true}
});

// 3. Review results and plan
console.log(`Would create ${legacyResult.result.createdTrialdays} trialday documents`);
```

### Phase 2: Legacy Opportunities Migration
```typescript
// 4. Execute legacy migration (no emails)
const result = await migrateTrialdayData({
  type: 'legacy-opportunities',
  options: {
    dryRun: false,
    sendEmails: false
  }
});
```

### Phase 3: Typeform Submissions (Optional)
```typescript
// 5. Only if you have old typeform data and want to reprocess
const typeformResult = await migrateTrialdayData({
  type: 'typeform-submissions',
  options: {
    dryRun: false,
    sendEmails: false  // Keep false unless you're certain
  },
  typeformData: yourOldTypeformData
});
```

## Monitoring and Verification

### 1. **Check Migration Results**
```typescript
// After migration, verify the results
const status = await getMigrationStatus();
console.log(`Migration complete: ${status.statistics.missingTrialdays} missing trialdays remaining`);
```

### 2. **Monitor Scheduled Function**
- The `trialdayFollowup` function should now run without errors
- Check logs for successful processing
- Monitor the `missing-trialdays` collection for any remaining issues

### 3. **Audit Trail**
- All migration activities are logged
- Check Firebase Functions logs for detailed information
- Review the `missing-trialdays` collection for investigation

## Best Practices

### 1. **Always Start with Dry Run**
- Test migrations before executing
- Review what would be created
- Verify the scope is correct

### 2. **Keep Emails Disabled**
- Only enable emails if you're absolutely certain
- Consider the user experience impact
- Test with a small subset first

### 3. **Monitor Progress**
- Check logs during migration
- Verify results after completion
- Monitor system performance

### 4. **Backup First**
- Ensure you have backups of your data
- Test in development environment first
- Have a rollback plan

## Troubleshooting

### Common Issues

1. **Function Not Found**
   - Ensure the migration functions are deployed
   - Check function names in Firebase Console

2. **Permission Errors**
   - Verify Firebase security rules
   - Check service account permissions

3. **Timeout Errors**
   - Large migrations may timeout
   - Break into smaller batches
   - Use opportunity IDs to migrate specific records

4. **Missing Data**
   - Check OfficeRnd API connectivity
   - Verify Firestore access
   - Review error logs for details

### Getting Help

1. Check the Firebase Functions logs
2. Review the `missing-trialdays` collection
3. Test with a small subset of data
4. Contact your development team

## Conclusion

This migration solution provides a safe, controlled way to handle legacy data without sending inappropriate emails. The key is to:

1. **Always start with dry runs**
2. **Keep emails disabled by default**
3. **Monitor the process carefully**
4. **Test with small batches first**

By following this approach, you can resolve the scheduled function errors while maintaining data integrity and user experience. 