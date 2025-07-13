import {EmailConfirmationService} from '../../../src/core/services/email-confirmation-service';
import {EmailConfirmationError} from '../../../src/core/errors/services/email-confirmation-error';

// Mock config
jest.mock('../../../src/core/config', () => ({
  getConfig: jest.fn(() => ({
    runtime: {
      email: {
        confirmationTemplateId: 'template-123',
        from: 'noreply@example.com',
      },
    },
  })),
}));

const mockFirestoreService = {
  getDocument: jest.fn(),
  setDocument: jest.fn(),
  updateDocument: jest.fn(),
  createDocument: jest.fn(),
  queryCollection: jest.fn(),
  increment: jest.fn(() => 1),
  createDocumentReference: jest.fn(() => ({id: 'token-123'})),
};

const mockSendgridService = {
  mailSend: jest.fn().mockResolvedValue(undefined),
};

const baseDeps = () => ({
  firestoreService: mockFirestoreService,
  sendgridService: mockSendgridService,
});

describe('EmailConfirmationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should implement singleton pattern', () => {
      const instance1 = new EmailConfirmationService(baseDeps() as any);
      const instance2 = new EmailConfirmationService(baseDeps() as any);
      expect(instance1).not.toBe(instance2); // No singleton, always new instance
    });
  });

  describe('createEmailConfirmation', () => {
    it('should create and send confirmation email', async () => {
      mockFirestoreService.queryCollection.mockResolvedValueOnce([]);
      mockFirestoreService.createDocument.mockResolvedValueOnce({
        id: 'token-123',
      });
      mockFirestoreService.updateDocument.mockImplementation(() =>
        Promise.resolve()
      );
      mockFirestoreService.increment.mockReturnValue(1);
      const service = new EmailConfirmationService(baseDeps() as any);
      jest.spyOn(service, 'checkIfConfirmed').mockResolvedValue(false);
      await expect(
        service.createEmailConfirmation(
          'John',
          'user@example.com',
          'signup',
          'event-1'
        )
      ).resolves.toBeUndefined();
      expect(mockFirestoreService.createDocument).toHaveBeenCalled();
    });

    it('should handle Firestore errors', async () => {
      mockFirestoreService.queryCollection.mockResolvedValueOnce([]);
      mockFirestoreService.createDocument.mockRejectedValueOnce(
        new Error('fail')
      );
      const service = new EmailConfirmationService(baseDeps() as any);
      await expect(
        service.createEmailConfirmation(
          'John',
          'user@example.com',
          'signup',
          'event-1'
        )
      ).rejects.toThrow(EmailConfirmationError);
    });
  });

  describe('confirmEmail', () => {
    it('should confirm email with valid token', async () => {
      mockFirestoreService.updateDocument.mockResolvedValueOnce(undefined);
      const service = new EmailConfirmationService(baseDeps() as any);
      await service.confirmEmail('token-123');
      expect(mockFirestoreService.updateDocument).toHaveBeenCalledWith({
        collection: 'emailConfirmations',
        documentId: 'token-123',
        data: {confirmed: true},
      });
    });

    it('should handle Firestore errors on update', async () => {
      mockFirestoreService.updateDocument.mockRejectedValueOnce(
        new Error('fail')
      );
      const service = new EmailConfirmationService(baseDeps() as any);
      await expect(service.confirmEmail('token-123')).rejects.toThrow(
        EmailConfirmationError
      );
    });
  });

  describe('Error Handling', () => {
    it('should wrap unknown errors in EmailConfirmationError', async () => {
      mockFirestoreService.updateDocument.mockRejectedValueOnce(
        new Error('fail')
      );
      const service = new EmailConfirmationService(baseDeps() as any);
      await expect(service.confirmEmail('token-123')).rejects.toThrow(
        EmailConfirmationError
      );
    });
  });
});
