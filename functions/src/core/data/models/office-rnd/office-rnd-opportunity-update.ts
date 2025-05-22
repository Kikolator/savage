import { OfficeRndOpportunityProperties } from '..';

export interface OfficeRndOpportunityUpdate {
    properties?: OfficeRndOpportunityProperties;
    name?: string;
    startDate?: Date;
    status?: string;
}
