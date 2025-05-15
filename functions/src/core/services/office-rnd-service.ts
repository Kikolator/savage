import { logger } from 'firebase-functions';
import { officeRndConfig } from '../config/office-rnd-config';
import { SetDoc } from '../data/models';
import { FirestoreService } from './firestore-service';
import { AppError, ErrorCode } from '../errors/app-error';

export default class OfficeRndService {
  private readonly officeRndCollection = 'officeRnd';

  constructor(
    private readonly params: {
      firestoreService: FirestoreService,
    }
  ) { }

  public async getAndSaveToken(secretKey: string): Promise<void> {
    logger.info('OfficeRndService.getAndSaveToken() - Getting and saving OAuth2.0 token');
    // Get config for Office Rnd.
    const clientId = officeRndConfig.clientId;
    const grantType = officeRndConfig.grantType;
    const scopes = officeRndConfig.scopes;
    // Encode params.
    const encodedParams = new URLSearchParams();
    encodedParams.set('client_id', clientId);
    encodedParams.set('client_secret', secretKey);
    encodedParams.set('grant_type', grantType);
    encodedParams.set('scope', scopes);
    // Make request to Office Rnd.
    const url = 'https://identity.officernd.com/oauth/token';
    const options = {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: encodedParams,
    };
    logger.debug('OfficeRndService.getAndSaveToken() - Request', {url: url, options: options});
    const response = await fetch(url, options);
    const body = await response.json();
    logger.debug('OfficeRndService.getAndSaveToken() - Response', {response: response, body: body});
    if (response.status !== 200) {
      throw new AppError('Failed to get Office Rnd OAuth2.0 token', ErrorCode.UNKNOWN_ERROR, 500, body);
    }
    // Save token to firestore.
    const token: string = body.access_token;
    const tokenType: string = body.token_type;
    const tokenExpiry: number = body.expires_in;
    const scope: string = body.scope;
    const doc: SetDoc = {
      collection: this.officeRndCollection,
      documentId: 'token',
      merge: true,
      data: {
        token: token,
        tokenType: tokenType,
        tokenExpiry: tokenExpiry,
        scope: scope,
      },
    };
    await this.params.firestoreService.setDocument(doc);
  }

  public async getMemberByEmail(email: string) {
    logger.info('OfficeRndService.getMemberByEmail() - Getting member by email', {email: email});
    // get token from firestore.
    // get member by email.
    throw new AppError('Not implemented', ErrorCode.UNKNOWN_ERROR);
  }
}
