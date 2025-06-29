export interface TypeformField {
  id: string;
  ref: string;
  type: string;
  title?: string;
  allow_multiple_selections?: boolean;
  choices?: Array<{
    id: string;
    ref: string;
    label: string;
  }>;
  properties?: {
    [key: string]: string;
  };
}
