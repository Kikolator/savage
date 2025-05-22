export interface SendgridContactRequest {
  email: string;
  phone_number_id?: string;
  external_id?: string;
  anonymous_id?: string;
  first_name?: string;
  last_name?: string;
  alternate_emails?: Array<string>;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province_region?: string;
  country?: string;
  postal_code?: string;
  custom_fields?: {
    [key: string]: string;
  };
}
