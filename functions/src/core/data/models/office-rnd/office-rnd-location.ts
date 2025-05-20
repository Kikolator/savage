export interface OfficeRndLocation {
  _id: string;
  name: string;
  address: {
    country: string;
    state: string;
    city: string;
    zip: string;
    latitude: string;
    longitude: string;
  };
  timezone: string;
  isOpen: boolean;
  isPublic: boolean;
}
