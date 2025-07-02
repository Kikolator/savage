import {logger} from 'firebase-functions';

import {officeRndConfig} from '../config/office-rnd-config';
import {
  OfficeRndLocation,
  OfficeRndMember,
  OfficeRndMemberProperties,
  OfficeRndNewMember,
  OfficeRndOpportunity,
  OfficeRndOpportunityStatus,
  OfficeRndOpportunityUpdate,
  OfficeRndPaymentLine,
  OfficeRndTokenResponse,
  SetDoc,
} from '../data/models';
import {AppError, ErrorCode} from '../errors/app-error';
import {firebaseSecrets} from '../config/firebase-secrets';
import {isDevelopment} from '../utils/environment';
import {OfficeRndMemberStatus} from '../data/enums';

import {FirestoreService} from './firestore-service';

export default class OfficeRndService {
  private token: OfficeRndTokenResponse | null = null;
  private readonly officeRndCollection = 'officeRnd';
  private readonly tokenDocumentId = 'token';
  private readonly metadataDocumentId = 'metadata';
  private readonly opportunityStatusesCollection = 'opportunityStatuses';
  constructor(
    private readonly params: {
      firestoreService: FirestoreService;
    }
  ) {}

  private async initializeToken(): Promise<void> {
    try {
      logger.info('OfficeRndService.initializeToken() - Initializing token');

      // If token is null, get it from firestore
      if (this.token == null) {
        const response = (await this.params.firestoreService.getDocument(
          this.officeRndCollection,
          this.tokenDocumentId
        )) as OfficeRndTokenResponse;
        this.token = response;
      }

      // Validate token exists
      if (this.token == null) {
        throw new AppError(
          'OfficeRndService.initializeToken()- Office Rnd token is null',
          ErrorCode.UNKNOWN_ERROR,
          500
        );
      }

      // Check if token is expired
      const now = new Date();
      if (!this.token.updated_at) {
        throw new AppError(
          'Office Rnd token updated_at field is null',
          ErrorCode.UNKNOWN_ERROR,
          500
        );
      }

      // Convert Firestore Timestamp to Date
      const updatedAtDate = new Date(
        this.token.updated_at._seconds * 1000 +
          this.token.updated_at._nanoseconds / 1000000
      );
      const tokenExpiry = new Date(updatedAtDate);
      tokenExpiry.setSeconds(tokenExpiry.getSeconds() + this.token.expires_in);

      // Refresh token if expired
      if (tokenExpiry < now) {
        await this._getAndSaveToken(firebaseSecrets.officeRndSecretKey.value());

        // Get the new token from firestore
        this.token = (await this.params.firestoreService.getDocument(
          this.officeRndCollection,
          this.tokenDocumentId
        )) as OfficeRndTokenResponse;
      }
    } catch (error) {
      logger.warn(
        'OfficeRndService.initializeToken()- Error initializing token',
        {error}
      );
      if (error instanceof AppError) {
        if (error.code === ErrorCode.DOCUMENT_NOT_FOUND) {
          await this._getAndSaveToken(
            firebaseSecrets.officeRndSecretKey.value()
          );
          await this.initializeToken();
          return;
        }
        throw error;
      }

      throw new AppError(
        'OfficeRndService.initializeToken()- Failed to initialize token',
        ErrorCode.UNKNOWN_ERROR,
        500,
        error
      );
    }
  }

  // Gets and saves a new token from Office Rnd in db.
  public async _getAndSaveToken(secretKey: string): Promise<void> {
    logger.info(
      'OfficeRndService.getAndSaveToken() - Getting and saving OAuth2.0 token'
    );

    // Check secret is not empty.
    if (secretKey == null || secretKey == '') {
      throw new AppError(
        'OfficeRndService.getAndSaveToken() - Secret key is empty',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }

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
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: encodedParams,
    };
    const response = await fetch(url, options);
    const body = await response.json();
    if (response.status !== 200) {
      throw new AppError(
        'Failed to get Office Rnd OAuth2.0 token',
        ErrorCode.UNKNOWN_ERROR,
        500,
        body
      );
    }
    // Save token to firestore.
    const tokenResponse: OfficeRndTokenResponse = body;
    const doc: SetDoc = {
      collection: this.officeRndCollection,
      documentId: this.tokenDocumentId,
      merge: true,
      data: tokenResponse,
    };
    await this.params.firestoreService.setDocument(doc);
    return;
  }

  public async getMember(id: string): Promise<OfficeRndMember> {
    logger.info('OfficeRndService.getMember() - Getting member', {id: id});

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.getMember() - Skipping API call in development mode'
      );
      // Return mock data for testing
      return {
        _id: id,
        name: 'Test User',
        email: 'test@example.com',
        location: 'mock-location-id',
        company: 'mock-company-id',
        status: OfficeRndMemberStatus.LEAD,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
      } as OfficeRndMember;
    }

    // initilize token.
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.getMember()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }
    // Get member from Office Rnd.
    const url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/members/${id}`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.token.access_token}`,
      },
    };
    const response = await fetch(url, options);
    const body = await response.json();
    if (response.status !== 200) {
      throw new AppError(
        'OfficeRndService.getMember()- Failed to get Office Rnd member',
        ErrorCode.UNKNOWN_ERROR,
        500,
        body
      );
    }
    const member: OfficeRndMember = body;
    return member;
  }

  // Gets members by email from Office Rnd.
  // Returns an array of OfficeRndMember objects.
  public async getMembersByEmail(
    email: string
  ): Promise<Array<OfficeRndMember>> {
    logger.info(
      'OfficeRndService.getMembersByEmail() - Getting members by email',
      {email: email}
    );

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.getMembersByEmail() - Skipping API call in development mode'
      );
      // Return mock data for testing
      return [
        {
          _id: 'mock-member-id',
          name: 'Test User',
          email: email,
          location: 'mock-location-id',
          company: 'mock-company-id',
          status: OfficeRndMemberStatus.LEAD,
          startDate: new Date(),
          createdAt: new Date(),
          modifiedAt: new Date(),
          properties: {},
        } as OfficeRndMember,
      ];
    }

    // Initialize token.
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.getMembersByEmail()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }
    logger.debug('token initiliazation complete', {token: this.token});

    // get member by email.
    const url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/members?email=${email}`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${this.token.access_token}`,
      },
    };

    const response = await fetch(url, options);
    const body = await response.json();
    if (response.status !== 200) {
      throw new AppError(
        'OfficeRndService.getMembersByEmail()- Failed to get Office Rnd members by email',
        ErrorCode.UNKNOWN_ERROR,
        500,
        body
      );
    }
    const members: Array<OfficeRndMember> = body.results;
    return members;
  }

  // Updates a member in Office Rnd.
  public async updateMember(id: string, properties: OfficeRndMemberProperties) {
    logger.info('OfficeRndService.updateMember() - Updating member', {
      id: id,
      properties: properties,
    });

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.updateMember() - Skipping API call in development mode'
      );
      return;
    }

    // initilize token.
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.updateMember()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }
    // Update the member.
    const url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/members/${id}`;
    const options = {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.token.access_token}`,
      },
      body: JSON.stringify({properties: properties}),
    };
    const response = await fetch(url, options);
    const body = await response.json();
    if (response.status !== 200) {
      throw new AppError(
        'OfficeRndService.updateMember()- Failed to update Office Rnd member',
        ErrorCode.UNKNOWN_ERROR,
        500,
        body
      );
    }
    return;
  }

  // Get all locations from OfficeRnd.
  public async getLocations(): Promise<Array<OfficeRndLocation>> {
    logger.info('OfficeRndService.getLocations() - Getting locations');

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.getLocations() - Skipping API call in development mode'
      );
      // Return mock data for testing
      return [
        {
          _id: 'mock-location-id',
          name: 'Mock Location',
          address: {
            country: 'Germany',
            state: 'Berlin',
            city: 'Berlin',
            zip: '10115',
            latitude: '52.5200',
            longitude: '13.4050',
          },
          timezone: 'Europe/Berlin',
          isOpen: true,
          isPublic: true,
        } as OfficeRndLocation,
      ];
    }

    // initilize token.
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.getLocations()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }
    // TODO Get locations from firestore.
    // If empty, get from Office Rnd.
    const url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/locations`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.token.access_token}`,
      },
    };
    const response = await fetch(url, options);
    const body = await response.json();
    if (response.status !== 200) {
      throw new AppError(
        'OfficeRndService.getLocations()- Failed to get Office Rnd locations',
        ErrorCode.UNKNOWN_ERROR,
        500,
        body
      );
    }
    const locations: Array<OfficeRndLocation> = body.results;
    // TODO Save to firestore.
    // Return locations.
    return locations;
  }

  // Create a new member in Office Rnd.
  public async createMember(
    member: OfficeRndNewMember
  ): Promise<OfficeRndMember> {
    logger.info('OfficeRndService.createMember() - Creating member', {
      member: member,
    });

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.createMember() - Skipping API call in development mode'
      );
      // Return mock data for testing
      return {
        _id: 'mock-created-member-id',
        name: member.name,
        email: member.email,
        location: member.location,
        company: 'mock-company-id',
        status: OfficeRndMemberStatus.LEAD,
        startDate: member.startDate,
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: member.properties,
      } as OfficeRndMember;
    }

    // initilize token.
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.createMember()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }
    const url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/members`;
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.token.access_token}`,
      },
      body: JSON.stringify(member),
    };
    const response = await fetch(url, options);
    const body = await response.json();
    if (response.status !== 201) {
      logger.warn('OfficeRndService.createMember()- status is not 201', {
        status: response.status,
      });
      throw new AppError(
        'OfficeRndService.createMember()- Failed to create Office Rnd member',
        ErrorCode.UNKNOWN_ERROR,
        500,
        body
      );
    }
    const createdMember: OfficeRndMember = body;
    return createdMember;
  }

  // Get all oportunity statuses from Office Rnd.
  public async getOpportunityStatuses(): Promise<
    Array<OfficeRndOpportunityStatus>
  > {
    logger.info(
      'OfficeRndService.getOpportunityStatuses() - Getting opportunity statuses'
    );

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.getOpportunityStatuses() - Skipping API call in development mode'
      );
      // Return mock data for testing
      return [
        {
          _id: '682200cd47119167b0c24e9a',
          description: 'Mock Opportunity Status',
          probability: 50,
          isSystem: false,
        } as OfficeRndOpportunityStatus,
      ];
    }

    // initilize token.
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.getOpportunityStatuses()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }

    // Try to get from Firestore first
    try {
      const query = await this.params.firestoreService.getCollection(
        this.officeRndCollection,
        true,
        this.metadataDocumentId,
        this.opportunityStatusesCollection
      );
      const statusesResult: Array<OfficeRndOpportunityStatus> = [];
      query.forEach((documentData) => {
        statusesResult.push(documentData as OfficeRndOpportunityStatus);
      });
      return statusesResult;
    } catch (error) {
      // Only proceed to OfficeRnd if Firestore collection is empty
      if (
        !(error instanceof AppError) ||
        error.code !== ErrorCode.COLLECTION_EMPTY
      ) {
        throw error;
      }
    }

    // Get from OfficeRnd API
    const url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/opportunity-statuses`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.token.access_token}`,
      },
    };

    try {
      const response = await fetch(url, options);
      const body = await response.json();

      if (response.status !== 200) {
        throw new AppError(
          'OfficeRndService.getOpportunityStatuses()- Failed to get Office Rnd opportunity statuses',
          ErrorCode.UNKNOWN_ERROR,
          response.status,
          body
        );
      }

      const opportunityStatuses: Array<OfficeRndOpportunityStatus> =
        body.results;

      // Save to Firestore
      await this.params.firestoreService.setDocuments(
        opportunityStatuses.map((status) => ({
          collection: this.officeRndCollection,
          documentId: `${this.metadataDocumentId}/${this.opportunityStatusesCollection}/${status._id}`,
          data: status,
          merge: true,
        }))
      );

      return opportunityStatuses;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'OfficeRndService.getOpportunityStatuses()- Failed to fetch opportunity statuses',
        ErrorCode.UNKNOWN_ERROR,
        500,
        error
      );
    }
  }

  // Get opportunities from office rnd
  // TODO add firestore cache.
  public async getOpportunities(params: {
    id?: string;
    member?: string;
    company?: string;
    createdAt?: string;
    modifiedAt?: string;
  }): Promise<Array<OfficeRndOpportunity>> {
    logger.info('OfficeRndService.getOpportunities() - Getting opportunities');

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.getOpportunities() - Skipping API call in development mode'
      );
      // Return mock data for testing
      return [
        {
          _id: 'mock-opportunity-id',
          name: 'Mock Opportunity',
          company: 'mock-company-id',
          member: params.member || 'mock-member-id',
          status: 'mock-status',
          probability: 50,
          startDate: new Date(),
          dealSize: 1000,
          membersCount: 1,
          resources: [],
          requestedPlans: [],
          createdAt: new Date().toISOString(),
          createdBy: 'mock-user',
          modifiedAt: new Date().toISOString(),
          modifiedBy: 'mock-user',
        } as OfficeRndOpportunity,
      ];
    }

    // initilize token.
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.getOpportunities()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }
    let url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/opportunities`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.token.access_token}`,
      },
    };
    if (
      params.id ||
      params.member ||
      params.company ||
      params.createdAt ||
      params.modifiedAt
    ) {
      url += '?';
      if (params.id) {
        url += `_id=${params.id}`;
      }
      if (params.member) {
        url += `member=${params.member}`;
      }
      if (params.company) {
        url += `company=${params.company}`;
      }
      if (params.createdAt) {
        url += `createdAt=${params.createdAt}`;
      }
      if (params.modifiedAt) {
        url += `modifiedAt=${params.modifiedAt}`;
      }
    }
    const response = await fetch(url, options);
    const body = await response.json();
    if (response.status !== 200) {
      throw new AppError(
        'OfficeRndService.getOpportunities()- Failed to get Office Rnd opportunities',
        ErrorCode.UNKNOWN_ERROR,
        500,
        body
      );
    }
    return body.results as Array<OfficeRndOpportunity>;
  }

  // Updates an exisitng opportunity in Office Rnd.
  public async updateOpportunity(
    id: string,
    opportunity: OfficeRndOpportunityUpdate
  ): Promise<void> {
    logger.info('OfficeRndService.updateOpportunity() - Updating opportunity', {
      id: id,
      opportunity: opportunity,
    });

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.updateOpportunity() - Skipping API call in development mode'
      );
      return;
    }

    // initilize token.
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.updateOpportunity()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }
    const url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/opportunities/${id}`;
    const options = {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.token.access_token}`,
      },
      body: JSON.stringify(opportunity),
    };
    const response = await fetch(url, options);
    const body = await response.json();
    if (response.status !== 200) {
      throw new AppError(
        'OfficeRndService.updateOpportunity()- Failed to update Office Rnd opportunity',
        ErrorCode.UNKNOWN_ERROR,
        response.status,
        body
      );
    }
    return;
  }

  // Creates a new opportunity in Office Rnd.
  public async createOpportunity(
    opportunity: OfficeRndOpportunity
  ): Promise<void> {
    logger.info('OfficeRndService.createOpportunity() - Creating opportunity', {
      opportunity: opportunity,
    });

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.createOpportunity() - Skipping API call in development mode'
      );
      return;
    }

    // initilize token.
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.createOpportunity()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }
    const url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/opportunities`;
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.token.access_token}`,
      },
      body: JSON.stringify(opportunity),
    };
    const response = await fetch(url, options);
    const body = await response.json();
    if (response.status !== 201) {
      throw new AppError(
        'OfficeRndService.createOpportunity()- Failed to create Office Rnd opportunity',
        ErrorCode.UNKNOWN_ERROR,
        response.status,
        body
      );
    }
    return;
  }

  public async addOverPayment(params: {
    memberId: string;
    paymentLines: OfficeRndPaymentLine[];
    issueDate: Date;
    companyId?: string;
  }): Promise<void> {
    logger.info('OfficeRndService.addOverPayment() - Adding Overpayment', {
      memberId: params.memberId,
      companyId: params.companyId,
      paymentLines: params.paymentLines,
      issueDate: params.issueDate,
    });

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.addOverPayment() - Skipping API call in development mode'
      );
      return;
    }

    // initilize token.
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.addOverPayment()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }
    const url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/payments`;

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.token.access_token}`,
      },
      body: JSON.stringify({
        date: params.issueDate,
        location: officeRndConfig.defaultLocationId,
        lines: params.paymentLines,
        member: params.memberId,
        company: params.companyId,
        currency: 'EUR',
      }),
    };

    const response = await fetch(url, options);
    const body = await response.json();
    if (response.status !== 201) {
      throw new AppError(
        'OfficeRndService.addOverPayment()- Failed to add overpayment',
        ErrorCode.UNKNOWN_ERROR,
        response.status,
        body
      );
    }
    return;
  }

  /**
   * Adds a new fee to Office Rnd.
   * @param params - The parameters for the new fee.
   * @returns The ID of the new fee.
   */
  public async addNewFee(params: {
    feeName: string;
    issueDate: Date;
    planId: string;
    price: number;
    memberId: string;
    companyId: string | null;
  }): Promise<string> {
    logger.info('OfficeRndService.addNewFee() - Adding new fee', {
      feeName: params.feeName,
      issueDate: params.issueDate,
      planId: params.planId,
      price: params.price,
      memberId: params.memberId,
      companyId: params.companyId,
    });

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.addNewFee() - Skipping API call in development mode'
      );
      // Return mock fee ID for testing
      return 'mock-fee-id';
    }

    // initilize token.
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.addNewFee()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }

    const bodyObject: {
      name: string;
      issueDate: string;
      location: string;
      plan: string;
      price: number;
      member: string;
      company?: string;
    } = {
      name: params.feeName,
      issueDate: params.issueDate.toDateString(),
      location: officeRndConfig.defaultLocationId,
      plan: params.planId,
      price: params.price,
      member: params.memberId,
    };
    if (params.companyId !== null) {
      bodyObject.company = params.companyId;
    }

    const url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/fees`;
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.token.access_token}`,
      },
      body: JSON.stringify(bodyObject),
    };
    const response = await fetch(url, options);
    const body = await response.json();
    if (response.status !== 201) {
      throw new AppError(
        'OfficeRndService.addNewFee()- Failed to add new fee',
        ErrorCode.UNKNOWN_ERROR,
        response.status,
        body
      );
    }
    return body._id;
  }
}
