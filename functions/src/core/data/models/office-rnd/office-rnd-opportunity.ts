import { OfficeRndOpportunityProperties } from '..';

export interface OfficeRndOpportunity {
    properties?: OfficeRndOpportunityProperties;
    _id?: string;
    name: string;
    company?: string;
    member: string;
    status?: string;
    probability?: number;
    startDate?: Date;
    dealSize?: number;
    membersCount?: number;
    resources?: Array<string>;
    requestedPlans?: Array<string>;
    createdAt?: string;
    createdBy?: string;
    modifiedAt?: string;
    modifiedBy?: string;
}
