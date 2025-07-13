# Trialday Scheduled Function Best Practices

## Problem Statement

The `trialdayFollowup` scheduled function was encountering errors when processing old opportunities that don't have corresponding trialday documents in Firestore. This happens because:

1. **Legacy Data**: Opportunities created before the trialday system was implemented
2. **Manual Creation**: Opportunities created directly in OfficeRnd without going through the trialday flow
3. **Data Migration Issues**: Opportunities that weren't properly migrated during system updates

## Best Practices for Scheduled Functions

### 1. **Graceful Degradation**
Instead of throwing errors that stop the entire function:
- Log issues for monitoring
- Skip problematic records
- Continue processing other records
- Return early from individual record processing

### 2. **Comprehensive Error Handling**
- Use try-catch blocks around individual record processing
- Log detailed error information
- Don't let one bad record break the entire batch
- Track metrics for successful vs failed processing

### 3. **Data Validation**
- Validate required fields before processing
- Check for data consistency
- Handle null/undefined values gracefully
- Use early returns for invalid data

### 4. **Monitoring and Alerting**
- Log missing documents for investigation
- Create dedicated collections for tracking issues
- Set up alerts for patterns of missing data
- Track processing metrics

### 5. **Data Recovery Options**
- Create placeholder documents when appropriate
- Implement data reconciliation processes
- Provide manual intervention capabilities
- Document recovery procedures

## Implementation Details

### Modified `processTrialComplete` Method

The method now handles missing trialday documents gracefully:

```typescript
private async processTrialComplete(opportunity: OfficeRndOpportunity): Promise<void> {
  // Validate required fields
  if (!opportunity._id) {
    logger.warn('Skipping opportunity with undefined id');
    return;
  }

  // Query for trialday document
  const trialday = await trialdayService.getTrialdayByOpportunityId(opportunity._id);

  if (!trialday) {
    // Log missing trialday for investigation
    logger.warn('No trialday found for opportunity, skipping');
    await this.logMissingTrialday(opportunity);
    return; // Skip and continue with others
  }

  // Process normally
  await trialdayService.updateTrialdayStatus(trialday.id, TrialdayStatus.COMPLETED);
}
```

### Missing Trialday Logging

Missing trialdays are logged to a dedicated collection for investigation:

```typescript
private async logMissingTrialday(opportunity: OfficeRndOpportunity): Promise<void> {
  if (!isDevelopment()) {
    await firestoreService.createDocument({
      collection: 'missing-trialdays',
      data: {
        opportunityId: opportunity._id,
        opportunityName: opportunity.name,
        memberId: opportunity.member,
        status: opportunity.status,
        createdAt: new Date(),
        processedAt: new Date(),
        reason: 'No trialday document found in Firestore',
        source: 'trialdayFollowup-scheduled-function',
      },
    });
  }
}
```

### Enhanced Metrics Tracking

The function now tracks processing metrics:

```typescript
let processedCount = 0;
let errorCount = 0;

for (const opportunity of trialCompleteOpportunities) {
  try {
    await this.processTrialComplete(opportunity);
    processedCount++;
  } catch (error) {
    errorCount++;
    logger.error('Error processing individual opportunity', { error });
    // Continue processing other opportunities
  }
}
```

## Recovery Options

### 1. **Placeholder Creation**
For legacy opportunities, you can create placeholder trialday documents:

```typescript
const trialdayId = await trialdayService.createPlaceholderTrialday(
  opportunityId,
  memberId,
  opportunityName
);
```

### 2. **Manual Investigation**
Query the `missing-trialdays` collection to identify patterns:

```typescript
// Query missing trialdays
const missingTrialdays = await firestoreService.queryCollection('missing-trialdays', [
  { field: 'processedAt', operator: '>=', value: startDate }
]);
```

### 3. **Data Reconciliation**
Implement a reconciliation process to:
- Identify opportunities without trialdays
- Create appropriate trialday documents
- Update member properties
- Send follow-up communications

## Monitoring and Alerts

### Key Metrics to Track
- Total opportunities processed
- Successful updates
- Skipped opportunities (missing trialdays)
- Errors encountered
- Processing time

### Alert Thresholds
- Error rate > 10%
- Missing trialday rate > 20%
- Processing time > 5 minutes
- Function execution failures

### Log Analysis
Monitor these log patterns:
- `"No trialday found for opportunity, skipping"`
- `"Skipping opportunity with undefined id"`
- `"Error processing individual opportunity"`

## Future Improvements

### 1. **Automated Recovery**
- Implement automatic placeholder creation for legacy opportunities
- Add data validation and correction processes
- Create self-healing mechanisms

### 2. **Enhanced Monitoring**
- Add Cloud Monitoring dashboards
- Implement alerting based on metrics
- Create automated reports

### 3. **Data Quality**
- Implement data validation rules
- Add consistency checks
- Create data quality scores

### 4. **Performance Optimization**
- Batch processing for large datasets
- Parallel processing where possible
- Optimize database queries

## Testing

### Unit Tests
- Test missing trialday scenarios
- Test invalid opportunity data
- Test error handling paths

### Integration Tests
- Test with real OfficeRnd data
- Test error recovery scenarios
- Test monitoring and alerting

### Load Tests
- Test with large numbers of opportunities
- Test error rate scenarios
- Test performance under load

## Conclusion

By implementing these best practices, the `trialdayFollowup` scheduled function is now more robust and can handle missing data gracefully. The function will:

1. Continue processing even when encountering missing trialday documents
2. Log issues for investigation without breaking execution
3. Provide metrics for monitoring and alerting
4. Offer recovery options for data inconsistencies

This approach ensures the scheduled function remains reliable and maintainable while providing visibility into data quality issues. 