import {
  OfficeRndEventError,
  OfficeRndEventErrorCode,
} from '../../../../src/core/errors/event-triggers/office-rnd-event-error';

describe('OfficeRndEventError', () => {
  describe('constructor', () => {
    it('should create error with correct properties', () => {
      const error = new OfficeRndEventError(
        'Test error message',
        OfficeRndEventErrorCode.MEMBER_CREATION_HANDLER_FAILED,
        'testMethod',
        {testData: 'value'}
      );

      expect(error.message).toBe('Test error message');
      expect(error.eventCode).toBe(
        OfficeRndEventErrorCode.MEMBER_CREATION_HANDLER_FAILED
      );
      expect(error.code).toBe(
        OfficeRndEventErrorCode.MEMBER_CREATION_HANDLER_FAILED
      );
      expect(error.status).toBe(0);
      expect(error.details).toEqual({
        method: 'testMethod',
        testData: 'value',
        eventCode: OfficeRndEventErrorCode.MEMBER_CREATION_HANDLER_FAILED,
        eventTrigger: true,
      });
    });
  });

  describe('factory methods', () => {
    describe('memberCreationHandlerFailed', () => {
      it('should create error with correct context', () => {
        const error = OfficeRndEventError.memberCreationHandlerFailed(
          'member123',
          {
            additionalData: 'test',
          }
        );

        expect(error.message).toBe(
          'Failed to handle OfficeRnd member creation event'
        );
        expect(error.eventCode).toBe(
          OfficeRndEventErrorCode.MEMBER_CREATION_HANDLER_FAILED
        );
        expect(error.details).toEqual({
          method: 'onMemberCreated',
          memberId: 'member123',
          additionalData: 'test',
          eventCode: OfficeRndEventErrorCode.MEMBER_CREATION_HANDLER_FAILED,
          eventTrigger: true,
        });
      });
    });

    describe('memberStatusChangeHandlerFailed', () => {
      it('should create error with correct context', () => {
        const error = OfficeRndEventError.memberStatusChangeHandlerFailed(
          'member456',
          {
            additionalData: 'test',
          }
        );

        expect(error.message).toBe(
          'Failed to handle OfficeRnd member status change event'
        );
        expect(error.eventCode).toBe(
          OfficeRndEventErrorCode.MEMBER_STATUS_CHANGE_HANDLER_FAILED
        );
        expect(error.details).toEqual({
          method: 'onMemberStatusChanged',
          memberId: 'member456',
          additionalData: 'test',
          eventCode:
            OfficeRndEventErrorCode.MEMBER_STATUS_CHANGE_HANDLER_FAILED,
          eventTrigger: true,
        });
      });
    });

    describe('whatsappIntegrationFailed', () => {
      it('should create error for add operation', () => {
        const error = OfficeRndEventError.whatsappIntegrationFailed(
          'member789',
          'add',
          {
            reason: 'API timeout',
          }
        );

        expect(error.message).toBe('WhatsApp add operation failed');
        expect(error.eventCode).toBe(
          OfficeRndEventErrorCode.WHATSAPP_INTEGRATION_FAILED
        );
        expect(error.details).toEqual({
          method: 'onMemberCreated',
          memberId: 'member789',
          operation: 'add',
          reason: 'API timeout',
          eventCode: OfficeRndEventErrorCode.WHATSAPP_INTEGRATION_FAILED,
          eventTrigger: true,
        });
      });

      it('should create error for remove operation', () => {
        const error = OfficeRndEventError.whatsappIntegrationFailed(
          'member789',
          'remove',
          {
            reason: 'User not found',
          }
        );

        expect(error.message).toBe('WhatsApp remove operation failed');
        expect(error.eventCode).toBe(
          OfficeRndEventErrorCode.WHATSAPP_INTEGRATION_FAILED
        );
        expect(error.details).toEqual({
          method: 'onMemberCreated',
          memberId: 'member789',
          operation: 'remove',
          reason: 'User not found',
          eventCode: OfficeRndEventErrorCode.WHATSAPP_INTEGRATION_FAILED,
          eventTrigger: true,
        });
      });
    });

    describe('documentDataMissing', () => {
      it('should create error with document context', () => {
        const error = OfficeRndEventError.documentDataMissing(
          'doc123',
          'testMethod'
        );

        expect(error.message).toBe('Document data is missing');
        expect(error.eventCode).toBe(
          OfficeRndEventErrorCode.DOCUMENT_DATA_MISSING
        );
        expect(error.details).toEqual({
          method: 'testMethod',
          documentId: 'doc123',
          eventCode: OfficeRndEventErrorCode.DOCUMENT_DATA_MISSING,
          eventTrigger: true,
        });
      });
    });

    describe('unknownError', () => {
      it('should create generic error', () => {
        const error = OfficeRndEventError.unknownError('testMethod', {
          unexpectedData: 'value',
        });

        expect(error.message).toBe(
          'Unknown error occurred in OfficeRnd event trigger'
        );
        expect(error.eventCode).toBe(OfficeRndEventErrorCode.UNKNOWN_ERROR);
        expect(error.details).toEqual({
          method: 'testMethod',
          unexpectedData: 'value',
          eventCode: OfficeRndEventErrorCode.UNKNOWN_ERROR,
          eventTrigger: true,
        });
      });
    });
  });

  describe('error inheritance', () => {
    it('should be instance of AppError', () => {
      const error =
        OfficeRndEventError.memberCreationHandlerFailed('member123');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(OfficeRndEventError);
    });

    it('should have proper error name', () => {
      const error =
        OfficeRndEventError.memberCreationHandlerFailed('member123');
      expect(error.name).toBe('OfficeRndEventError');
    });
  });
});
