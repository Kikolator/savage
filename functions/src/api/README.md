# API Layer

This module contains REST API endpoints and controllers for external integrations.

## 📁 Structure

```
api/
├── controllers/           # Request handlers
│   ├── base-controller.ts # Base controller class
│   ├── typeform-controller/ # Typeform webhook handling
│   ├── office-rnd-controller/ # OfficeRnd webhook handling
│   └── confirm-email-controller/ # Email confirmation
├── middlewares/          # Request processing
│   └── typeform/         # Typeform signature verification
└── index.ts              # API function exports
```

## 🚀 Quick Start

### API Endpoints

#### Typeform Webhooks
- **POST** `/v1/webhook/typeform` - Handle Typeform submissions
- **Verification**: Typeform signature validation
- **Processing**: Trial day requests and email confirmations

#### OfficeRnd Webhooks
- **POST** `/v1/webhook/office-rnd` - Handle OfficeRnd member events
- **Verification**: OfficeRnd webhook signature validation
- **Processing**: Member creation and status changes

#### Email Confirmation
- **POST** `/v1/confirm-email` - Email confirmation webhook
- **OPTIONS** `/v1/confirm-email` - CORS preflight request
- **Processing**: Email confirmation workflows

#### OfficeRnd Management
- **GET** `/v1/initialize/office-rnd` - Initialize OfficeRnd data sync
- **GET** `/v1/backup-status` - Check OfficeRnd backup status
- **POST** `/v1/cleanup-faulty-webhooks` - Clean up faulty webhook data

#### Testing
- **GET** `/v1/ping` - Health check endpoint

## 🔧 Controller Patterns

### Base Controller
All controllers extend `BaseController` for consistent patterns:

```typescript
import {BaseController} from './base-controller';

class MyController extends BaseController {
  public async handleRequest(req: Request, res: Response): Promise<void> {
    this.logMethodEntry('handleRequest', {body: req.body});
    
    try {
      // Validate request
      this.validateRequest(req);
      
      // Process request
      const result = await this.processRequest(req.body);
      
      // Send response
      res.status(200).json(result);
      this.logMethodSuccess('handleRequest', result);
    } catch (error) {
      this.handleError(error, res);
    }
  }
}
```

### Webhook Verification
Controllers implement signature verification for security:

```typescript
private verifySignature(req: Request): void {
  const signature = req.headers['x-signature'];
  const payload = req.body;
  
  if (!this.isValidSignature(signature, payload)) {
    throw new UnauthorizedError('Invalid signature');
  }
}
```

## 🔒 Security

### Signature Verification
- **Typeform**: Uses Typeform webhook secret
- **OfficeRnd**: Uses OfficeRnd webhook secret
- **Email**: Uses internal API secret

### Request Validation
- Input sanitization
- Required field validation
- Type checking with TypeScript

## 📝 Error Handling

Controllers use consistent error handling:

```typescript
private handleError(error: Error, res: Response): void {
  this.logMethodError('handleRequest', error);
  
  if (error instanceof ValidationError) {
    res.status(400).json({error: error.message});
  } else if (error instanceof UnauthorizedError) {
    res.status(401).json({error: error.message});
  } else {
    res.status(500).json({error: 'Internal server error'});
  }
}
```

## 🧪 Testing

### Controller Tests
```typescript
describe('MyController', () => {
  it('should handle valid requests', async () => {
    const controller = new MyController();
    const req = createMockRequest(validPayload);
    const res = createMockResponse();
    
    await controller.handleRequest(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResult);
  });
});
```

### Integration Tests
```typescript
describe('API Integration', () => {
  it('should process webhook correctly', async () => {
    const response = await request(app)
      .post('/api/typeform')
      .send(validWebhookPayload)
      .set('x-signature', validSignature);
    
    expect(response.status).toBe(200);
  });
});
```

## 📚 Related Documentation

- **[API Reference](../docs/api.md)** - Complete endpoint documentation
- **[Typeform Integration](../docs/typeform.md)** - Typeform webhook guide
- **[OfficeRnd Integration](../docs/office-rnd.md)** - OfficeRnd webhook guide
- **[Base Controller](../controllers/base-controller.ts)** - Base controller implementation

## 🔗 Key Files

- `controllers/base-controller.ts` - Base controller with common patterns
- `controllers/typeform-controller/` - Typeform webhook handling
- `controllers/office-rnd-controller/` - OfficeRnd webhook handling
- `middlewares/typeform/` - Typeform signature verification
- `index.ts` - API function exports 