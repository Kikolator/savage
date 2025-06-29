import {OfficeRndMemberProperties} from '..';
import {OfficeRndMemberStatus} from '../../enums';

export interface OfficeRndMember {
  _id: string;
  name: string;
  email: string;
  location: string;
  company: string;
  status: OfficeRndMemberStatus;
  startDate: Date;
  createdAt: Date;
  modifiedAt: Date;
  properties: OfficeRndMemberProperties;
}
