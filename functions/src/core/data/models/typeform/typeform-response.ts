import {TypeformAnswer} from './typeform-answer';
import {TypeformField} from './typeform-fields';

export interface TypeformResponse {
  event_id: string;
  event_type: string;
  form_response: {
    form_id: string;
    token: string;
    landed_at: string;
    submitted_at: string;
    hidden: {[key: string]: string};
    definition: {
      id: string;
      title: string;
      fields: Array<TypeformField>;
      endings: Array<TypeformField>;
    };
    answers: Array<TypeformAnswer>;
    ending: {
      id: string;
      ref: string;
    };
  };
}
