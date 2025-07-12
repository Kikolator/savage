import {DocumentData} from 'firebase-admin/firestore';

import {OfficeRndMemberProperties} from '..';
import {OfficeRndMemberStatus} from '../../enums';

interface OfficeRndMemberData {
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

export class OfficeRndMember {
  // Static field constants for type-safe Firestore operations
  static readonly FIELDS = {
    ID: '_id',
    NAME: 'name',
    EMAIL: 'email',
    LOCATION: 'location',
    COMPANY: 'company',
    STATUS: 'status',
    START_DATE: 'startDate',
    CREATED_AT: 'createdAt',
    MODIFIED_AT: 'modifiedAt',
    PROPERTIES: 'properties',
  } as const;

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

  constructor(params: OfficeRndMemberData) {
    this._id = params._id;
    this.name = params.name;
    this.email = params.email;
    this.location = params.location;
    this.company = params.company;
    this.status = params.status;
    this.startDate = params.startDate;
    this.createdAt = params.createdAt;
    this.modifiedAt = params.modifiedAt;
    this.properties = params.properties;
  }

  static fromDocumentData(id: string, data: DocumentData): OfficeRndMember {
    return new OfficeRndMember({
      _id: id,
      name: data[OfficeRndMember.FIELDS.NAME] as string,
      email: data[OfficeRndMember.FIELDS.EMAIL] as string,
      location: data[OfficeRndMember.FIELDS.LOCATION] as string,
      company: data[OfficeRndMember.FIELDS.COMPANY] as string,
      status: data[OfficeRndMember.FIELDS.STATUS] as OfficeRndMemberStatus,
      startDate: data[OfficeRndMember.FIELDS.START_DATE]?.toDate() as Date,
      createdAt: data[OfficeRndMember.FIELDS.CREATED_AT]?.toDate() as Date,
      modifiedAt: data[OfficeRndMember.FIELDS.MODIFIED_AT]?.toDate() as Date,
      properties: data[
        OfficeRndMember.FIELDS.PROPERTIES
      ] as OfficeRndMemberProperties,
    });
  }

  toDocumentData(): DocumentData {
    return {
      [OfficeRndMember.FIELDS.ID]: this._id,
      [OfficeRndMember.FIELDS.NAME]: this.name,
      [OfficeRndMember.FIELDS.EMAIL]: this.email,
      [OfficeRndMember.FIELDS.LOCATION]: this.location,
      [OfficeRndMember.FIELDS.COMPANY]: this.company,
      [OfficeRndMember.FIELDS.STATUS]: this.status,
      [OfficeRndMember.FIELDS.START_DATE]: this.startDate,
      [OfficeRndMember.FIELDS.CREATED_AT]: this.createdAt,
      [OfficeRndMember.FIELDS.MODIFIED_AT]: this.modifiedAt,
      [OfficeRndMember.FIELDS.PROPERTIES]: this.properties,
    };
  }

  toJson(): Record<string, unknown> {
    return {
      [OfficeRndMember.FIELDS.ID]: this._id,
      [OfficeRndMember.FIELDS.NAME]: this.name,
      [OfficeRndMember.FIELDS.EMAIL]: this.email,
      [OfficeRndMember.FIELDS.LOCATION]: this.location,
      [OfficeRndMember.FIELDS.COMPANY]: this.company,
      [OfficeRndMember.FIELDS.STATUS]: this.status,
      [OfficeRndMember.FIELDS.START_DATE]: this.startDate.toISOString(),
      [OfficeRndMember.FIELDS.CREATED_AT]: this.createdAt.toISOString(),
      [OfficeRndMember.FIELDS.MODIFIED_AT]: this.modifiedAt.toISOString(),
      [OfficeRndMember.FIELDS.PROPERTIES]: this.properties,
    };
  }

  static fromJson(json: Record<string, unknown>): OfficeRndMember {
    return new OfficeRndMember({
      _id: json[OfficeRndMember.FIELDS.ID] as string,
      name: json[OfficeRndMember.FIELDS.NAME] as string,
      email: json[OfficeRndMember.FIELDS.EMAIL] as string,
      location: json[OfficeRndMember.FIELDS.LOCATION] as string,
      company: json[OfficeRndMember.FIELDS.COMPANY] as string,
      status: json[OfficeRndMember.FIELDS.STATUS] as OfficeRndMemberStatus,
      startDate: new Date(json[OfficeRndMember.FIELDS.START_DATE] as string),
      createdAt: new Date(json[OfficeRndMember.FIELDS.CREATED_AT] as string),
      modifiedAt: new Date(json[OfficeRndMember.FIELDS.MODIFIED_AT] as string),
      properties: json[
        OfficeRndMember.FIELDS.PROPERTIES
      ] as OfficeRndMemberProperties,
    });
  }
}
