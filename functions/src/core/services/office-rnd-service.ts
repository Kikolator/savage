import {logger} from 'firebase-functions';

import {officeRndConfig} from '../config/office-rnd-config';
import {
  OfficeRndCompany,
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
  public static readonly metadataCollection = 'officeRndMetadata';
  public static readonly tokenDocumentId = 'token';
  public static readonly opportunityStatusesCollection =
    'officeRndOpportunityStatuses';
  public static readonly opportunitiesCollection = 'officeRndOpportunities';
  public static readonly membersCollection = 'officeRndMembers';
  public static readonly companiesCollection = 'officeRndCompanies';
  constructor(
    private readonly params: {
      firestoreService: FirestoreService;
    }
  ) {}

  /**
   * Generic method to handle paginated API calls to Office Rnd
   * @param endpoint - The API endpoint path (e.g., 'members', 'locations', 'opportunities')
   * @param methodName - Name of the calling method for logging purposes
   * @param additionalParams - Optional query parameters to append to the URL
   * @returns Array of results from all pages
   */
  private async fetchAllPages<T>(
    endpoint: string,
    methodName: string,
    additionalParams?: Record<string, string>
  ): Promise<Array<T>> {
    logger.info(`${methodName} - Starting paginated fetch for ${endpoint}`);

    // Initialize token
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        `${methodName} - Office Rnd token is null`,
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }

    const allResults: Array<T> = [];
    let cursorNext: string | null = null;
    let pageCount = 0;

    do {
      pageCount++;
      logger.debug(`${methodName} - Fetching page ${pageCount}`);

      // Build URL with endpoint and parameters
      let url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/${endpoint}`;
      const params = new URLSearchParams();

      // Add additional parameters if provided
      if (additionalParams) {
        Object.entries(additionalParams).forEach(([key, value]) => {
          params.append(key, value);
        });
      }

      // Add cursor parameter if available
      if (cursorNext) {
        params.append('$cursorNext', cursorNext);
      }

      // Append parameters to URL if any exist
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${this.token.access_token}`,
        },
      };

      const response = await fetch(url, options);
      const body = await response.json();
      logger.debug(`${methodName} - Response status`, {
        status: response.status,
      });

      if (response.status !== 200) {
        throw new AppError(
          `${methodName} - Failed to fetch ${endpoint}`,
          ErrorCode.UNKNOWN_ERROR,
          500,
          body
        );
      }

      logger.debug(`${methodName} - Got page ${pageCount}`, {
        rangeStart: body.rangeStart,
        rangeEnd: body.rangeEnd,
        cursorNext: body.cursorNext,
        cursorPrev: body.cursorPrev,
        total: body.results.length,
      });

      // Add results to the collection
      allResults.push(...body.results);

      // Update cursor for next iteration
      cursorNext = body.cursorNext || null;
    } while (cursorNext);

    logger.info(`${methodName} - Completed fetching all ${endpoint}`, {
      totalPages: pageCount,
      totalResults: allResults.length,
    });

    return allResults;
  }

  private async initializeToken(): Promise<void> {
    try {
      logger.info('OfficeRndService.initializeToken() - Initializing token');

      // If token is null, get it from firestore
      if (this.token == null) {
        const response = (await this.params.firestoreService.getDocument(
          OfficeRndService.metadataCollection,
          OfficeRndService.tokenDocumentId
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
          OfficeRndService.metadataCollection,
          OfficeRndService.tokenDocumentId
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
      collection: OfficeRndService.metadataCollection,
      documentId: OfficeRndService.tokenDocumentId,
      merge: true,
      data: tokenResponse,
    };
    await this.params.firestoreService.setDocument(doc);
    return;
  }

  public async getMember(id: string): Promise<OfficeRndMember> {
    logger.info('OfficeRndService.getMember() - Getting member', {id: id});

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

  // Get all members from Firestore (source of truth)
  public async getAllMembers(): Promise<Array<OfficeRndMember>> {
    logger.info(
      'OfficeRndService.getAllMembers() - Getting all members from Firestore'
    );

    try {
      const query = await this.params.firestoreService.getCollection(
        OfficeRndService.membersCollection
      );
      const membersResult: Array<OfficeRndMember> = [];
      query.forEach((documentData) => {
        membersResult.push(documentData as OfficeRndMember);
      });

      if (membersResult.length === 0) {
        logger.warn(
          'OfficeRndService.getAllMembers() - No members found in Firestore. Webhook sync may not be working.'
        );
      }

      return membersResult;
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === ErrorCode.COLLECTION_EMPTY
      ) {
        logger.warn(
          'OfficeRndService.getAllMembers() - Members collection is empty. Webhook sync may not be working.'
        );
        return [];
      }
      throw error;
    }
  }

  // Get all members from OfficeRnd API (for migration, recovery, validation)
  public async getAllMembersFromAPI(): Promise<Array<OfficeRndMember>> {
    logger.info(
      'OfficeRndService.getAllMembersFromAPI() - Getting all members from OfficeRnd API'
    );

    return this.fetchAllPages<OfficeRndMember>(
      'members',
      'OfficeRndService.getAllMembersFromAPI()'
    );
  }

  // Get all companies from OfficeRnd API (for migration, recovery, validation)
  public async getAllCompaniesFromAPI(): Promise<Array<OfficeRndCompany>> {
    logger.info(
      'OfficeRndService.getAllCompaniesFromAPI() - Getting all companies from OfficeRnd API'
    );

    return this.fetchAllPages<OfficeRndCompany>(
      'companies',
      'OfficeRndService.getAllCompaniesFromAPI()'
    );
  }

  // Get all companies from Firestore (source of truth)
  public async getAllCompanies(): Promise<Array<OfficeRndCompany>> {
    logger.info(
      'OfficeRndService.getAllCompanies() - Getting all companies from Firestore'
    );

    try {
      const query = await this.params.firestoreService.getCollection(
        OfficeRndService.companiesCollection
      );
      const companiesResult: Array<OfficeRndCompany> = [];
      query.forEach((documentData) => {
        companiesResult.push(documentData as OfficeRndCompany);
      });

      if (companiesResult.length === 0) {
        logger.warn(
          'OfficeRndService.getAllCompanies() - No companies found in Firestore. Webhook sync may not be working.'
        );
      }

      return companiesResult;
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === ErrorCode.COLLECTION_EMPTY
      ) {
        logger.warn(
          'OfficeRndService.getAllCompanies() - Companies collection is empty. Webhook sync may not be working.'
        );
        return [];
      }
      throw error;
    }
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

    return this.fetchAllPages<OfficeRndMember>(
      'members',
      'OfficeRndService.getMembersByEmail()',
      {email: email}
    );
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

    // TODO Get locations from firestore.
    // If empty, get from Office Rnd.
    const locations = await this.fetchAllPages<OfficeRndLocation>(
      'locations',
      'OfficeRndService.getLocations()'
    );

    // TODO Save to firestore.
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

  // Get all opportunity statuses from Firestore (source of truth)
  public async getOpportunityStatuses(): Promise<
    Array<OfficeRndOpportunityStatus>
  > {
    logger.info(
      'OfficeRndService.getOpportunityStatuses() - Getting opportunity statuses from Firestore'
    );

    try {
      const query = await this.params.firestoreService.getCollection(
        OfficeRndService.opportunityStatusesCollection
      );
      const statusesResult: Array<OfficeRndOpportunityStatus> = [];
      query.forEach((documentData) => {
        statusesResult.push(documentData as OfficeRndOpportunityStatus);
      });

      if (statusesResult.length === 0) {
        logger.warn(
          'OfficeRndService.getOpportunityStatuses() - No opportunity statuses found in Firestore. Webhook sync may not be working.'
        );
      }

      return statusesResult;
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === ErrorCode.COLLECTION_EMPTY
      ) {
        logger.warn(
          'OfficeRndService.getOpportunityStatuses() - Opportunity statuses collection is empty. Webhook sync may not be working.'
        );
        return [];
      }
      throw error;
    }
  }

  // Get opportunity statuses from OfficeRnd API (for migration, recovery, validation)
  public async getOpportunityStatusesFromAPI(): Promise<
    Array<OfficeRndOpportunityStatus>
  > {
    logger.info(
      'OfficeRndService.getOpportunityStatusesFromAPI() - Getting opportunity statuses from OfficeRnd API'
    );

    // Initialize token
    await this.initializeToken();
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.getOpportunityStatusesFromAPI()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }

    const url = `${officeRndConfig.apiV2url}/${officeRndConfig.orgSlug}/opportunity-statuses`;
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
        'OfficeRndService.getOpportunityStatusesFromAPI()- Failed to get Office Rnd opportunity statuses',
        ErrorCode.UNKNOWN_ERROR,
        response.status,
        body
      );
    }

    return body.results;
  }

  // Get opportunities from Firestore (source of truth)
  public async getOpportunities(params: {
    id?: string;
    member?: string;
    company?: string;
    createdAt?: string;
    modifiedAt?: string;
  }): Promise<Array<OfficeRndOpportunity>> {
    logger.info(
      'OfficeRndService.getOpportunities() - Getting opportunities from Firestore'
    );

    try {
      const query = await this.params.firestoreService.getCollection(
        OfficeRndService.opportunitiesCollection
      );
      const opportunitiesResult: Array<OfficeRndOpportunity> = [];

      query.forEach((documentData) => {
        const opportunity = documentData as OfficeRndOpportunity;

        // Apply filters if provided
        if (params.id && opportunity._id !== params.id) {
          return;
        }
        if (params.member && opportunity.member !== params.member) {
          return;
        }
        if (params.company && opportunity.company !== params.company) {
          return;
        }
        if (params.createdAt && opportunity.createdAt !== params.createdAt) {
          return;
        }
        if (params.modifiedAt && opportunity.modifiedAt !== params.modifiedAt) {
          return;
        }

        opportunitiesResult.push(opportunity);
      });

      if (
        opportunitiesResult.length === 0 &&
        Object.keys(params).length === 0
      ) {
        logger.warn(
          'OfficeRndService.getOpportunities() - No opportunities found in Firestore. Webhook sync may not be working.'
        );
      }

      return opportunitiesResult;
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === ErrorCode.COLLECTION_EMPTY
      ) {
        logger.warn(
          'OfficeRndService.getOpportunities() - Opportunities collection is empty. Webhook sync may not be working.'
        );
        return [];
      }
      throw error;
    }
  }

  // Get opportunities from OfficeRnd API (for migration, recovery, validation)
  public async getOpportunitiesFromAPI(params: {
    id?: string;
    member?: string;
    company?: string;
    createdAt?: string;
    modifiedAt?: string;
  }): Promise<Array<OfficeRndOpportunity>> {
    logger.info(
      'OfficeRndService.getOpportunitiesFromAPI() - Getting opportunities from OfficeRnd API'
    );

    // Build additional parameters object
    const additionalParams: Record<string, string> = {};
    if (params.id) additionalParams._id = params.id;
    if (params.member) additionalParams.member = params.member;
    if (params.company) additionalParams.company = params.company;
    if (params.createdAt) additionalParams.createdAt = params.createdAt;
    if (params.modifiedAt) additionalParams.modifiedAt = params.modifiedAt;

    return this.fetchAllPages<OfficeRndOpportunity>(
      'opportunities',
      'OfficeRndService.getOpportunitiesFromAPI()',
      Object.keys(additionalParams).length > 0 ? additionalParams : undefined
    );
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
  ): Promise<OfficeRndOpportunity> {
    logger.info('OfficeRndService.createOpportunity() - Creating opportunity', {
      opportunity: opportunity,
    });

    // Skip API call in development mode
    if (isDevelopment()) {
      logger.info(
        'OfficeRndService.createOpportunity() - Skipping API call in development mode'
      );
      return {
        _id: 'mock-created-opportunity-id',
        name: opportunity.name,
        member: opportunity.member,
        company: opportunity.company,
        status: opportunity.status,
      } as OfficeRndOpportunity;
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
    return body as OfficeRndOpportunity;
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
