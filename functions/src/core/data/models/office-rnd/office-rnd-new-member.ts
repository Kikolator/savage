import {OfficeRndMemberProperties} from '..';

export interface OfficeRndNewMember {
  name: string;
  location: string;
  startDate: Date;
  email: string;
  description: string;
  properties: OfficeRndMemberProperties;
}
