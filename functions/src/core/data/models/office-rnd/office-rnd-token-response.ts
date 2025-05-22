export interface OfficeRndTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  updated_at?: {
    _seconds: number;
    _nanoseconds: number;
  };
}
