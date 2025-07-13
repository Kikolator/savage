# Event Triggers

This module contains Firestore document change triggers that respond to database events.

## 📁 Structure

```
event-triggers/
├── by-document/           # Document-specific triggers
│   ├── office-rnd-member-events.ts    # Member lifecycle events
│   ├── office-rnd-member-logic.ts     # Member business logic
│   └── trialday-events.ts             # Trial day events
├── index.ts               # Trigger exports
└── initialize-event-triggers.ts       # Trigger initialization
```

## 🚀 Quick Start

### Trigger Functions

#### OfficeRnd Member Events
- **onOfficeRndMemberCreated**: New member registration
- **onOfficeRndMemberStatusChanged**: Member status updates

#### Trialday Events
- **onTrialdayChanged**: Trial day lifecycle management

### Usage
```typescript
import {onDocumentCreated} from 'firebase-functions/v2/firestore';

export const onOfficeRndMemberCreated = onDocumentCreated(
  'officeRndMembers/{memberId}',
  async (event) => {
    const memberData = event.data?.data();
    await processNewMember(memberData);
  }
);
```

## 🔧 Trigger Patterns

### **Document Change Triggers**
Respond to Firestore document changes:

```typescript
import {onDocumentCreated, onDocumentUpdated, onDocumentDeleted} from 'firebase-functions/v2/firestore';

// New document created
export const onDocumentCreated = onDocumentCreated(
  'collection/{docId}',
  async (event) => {
    const data = event.data?.data();
    await processNewDocument(data);
  }
);

// Document updated
export const onDocumentUpdated = onDocumentUpdated(
  'collection/{docId}',
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    await processDocumentUpdate(beforeData, afterData);
  }
);

// Document deleted
export const onDocumentDeleted = onDocumentDeleted(
  'collection/{docId}',
  async (event) => {
    const deletedData = event.data?.data();
    await processDocumentDeletion(deletedData);
  }
);
```

### **Business Logic Separation**
Separate trigger logic from business logic:

```typescript
// Trigger function (event-triggers/by-document/office-rnd-member-events.ts)
export const onOfficeRndMemberCreated = onDocumentCreated(
  'officeRndMembers/{memberId}',
  async (event) => {
    const memberData = event.data?.data();
    await handleNewMember(memberData);
  }
);

// Business logic (event-triggers/by-document/office-rnd-member-logic.ts)
export async function handleNewMember(memberData: OfficeRndMember): Promise<void> {
  const referralService = container.get('referralService');
  const sendgridService = container.get('sendgridService');
  
  // Process new member
  await referralService.processNewMember(memberData);
  await sendgridService.sendWelcomeEmail(memberData.email);
}
```

## 🔒 Security & Validation

### **Data Validation**
Validate trigger data before processing:

```typescript
export async function handleNewMember(memberData: any): Promise<void> {
  // Validate required fields
  if (!memberData.email || !memberData.name) {
    throw new ValidationError('Missing required fields');
  }
  
  // Validate data types
  if (typeof memberData.email !== 'string') {
    throw new ValidationError('Invalid email format');
  }
  
  // Process validated data
  await processMember(memberData);
}
```

### **Error Handling**
Robust error handling for trigger functions:

```typescript
export const onDocumentCreated = onDocumentCreated(
  'collection/{docId}',
  async (event) => {
    try {
      const data = event.data?.data();
      await processDocument(data);
    } catch (error) {
      console.error('Trigger function failed:', error);
      
      // Log error for monitoring
      await logError('trigger_function_error', {
        collection: 'collection',
        documentId: event.params.docId,
        error: error.message
      });
      
      // Re-throw to mark function as failed
      throw error;
    }
  }
);
```

## 📊 Monitoring & Logging

### **Structured Logging**
Use structured logging for better monitoring:

```typescript
export async function handleNewMember(memberData: OfficeRndMember): Promise<void> {
  const logger = container.get('logger');
  
  logger.info('Processing new member', {
    memberId: memberData.id,
    email: memberData.email,
    source: 'office_rnd_webhook'
  });
  
  try {
    await processMember(memberData);
    logger.info('Member processed successfully', {
      memberId: memberData.id
    });
  } catch (error) {
    logger.error('Failed to process member', {
      memberId: memberData.id,
      error: error.message
    });
    throw error;
  }
}
```

### **Performance Monitoring**
Track trigger function performance:

```typescript
export const onDocumentCreated = onDocumentCreated(
  'collection/{docId}',
  async (event) => {
    const startTime = Date.now();
    
    try {
      await processDocument(event.data?.data());
      
      // Log performance metrics
      console.log('Trigger function completed', {
        duration: Date.now() - startTime,
        documentId: event.params.docId
      });
    } catch (error) {
      console.error('Trigger function failed', {
        duration: Date.now() - startTime,
        documentId: event.params.docId,
        error: error.message
      });
      throw error;
    }
  }
);
```

## 🧪 Testing

### **Unit Testing**
```typescript
describe('handleNewMember', () => {
  it('should process new member correctly', async () => {
    const mockReferralService = createMockReferralService();
    const mockSendgridService = createMockSendgridService();
    
    container.register('referralService', () => mockReferralService);
    container.register('sendgridService', () => mockSendgridService);
    
    const memberData = createTestMemberData();
    await handleNewMember(memberData);
    
    expect(mockReferralService.processNewMember).toHaveBeenCalledWith(memberData);
    expect(mockSendgridService.sendWelcomeEmail).toHaveBeenCalledWith(memberData.email);
  });
});
```

### **Integration Testing**
```typescript
describe('OfficeRnd Member Trigger', () => {
  it('should handle member creation', async () => {
    const testData = createTestMemberData();
    
    // Simulate Firestore document creation
    const event = createDocumentCreatedEvent('officeRndMembers', 'test-id', testData);
    
    await onOfficeRndMemberCreated(event);
    
    // Verify side effects
    const createdMember = await getMemberFromDatabase('test-id');
    expect(createdMember).toBeDefined();
  });
});
```

## 📚 Related Documentation

- **[OfficeRnd Integration](../docs/office-rnd.md)** - OfficeRnd webhook guide
- **[Trialday Management](../docs/trialday.md)** - Trial day lifecycle
- **[Firestore Testing](../docs/FIRESTORE_TESTING.md)** - Database testing guide
- **[Error Handling](../core/errors/)** - Error management patterns

## 🔗 Key Files

- `by-document/office-rnd-member-events.ts` - Member lifecycle triggers
- `by-document/trialday-events.ts` - Trial day triggers
- `initialize-event-triggers.ts` - Trigger initialization
- `index.ts` - Trigger function exports 