import { TypeformField } from './typeform-fields';

export interface TypeformAnswer {
    type: string;
    text?: string;
    date?:string;
    choice?: {
        id: string;
        label: string;
        ref: string;
    };
    choices?: {
        ids: Array<string>;
        labels: Array<string>;
        refs: Array<string>;
    };
    phone_number?: string;
    email?:string;
    boolean?:boolean;
    file_url?:string;
    field: TypeformField;
    [key: string]: unknown;
}
