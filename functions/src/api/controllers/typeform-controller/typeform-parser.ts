import { logger } from 'firebase-functions';
import { TypeformAnswer, TypeformResponse } from '../../../core/data/models';
import { getTypeformMapping, TypeformTypes } from './typeform-mappings';

const getAnswers = (response: TypeformResponse): TypeformAnswer[] => {
  return response.form_response.answers;
};

const findAnswer = (
  answers: TypeformAnswer[],
  fieldId: string
): TypeformAnswer | undefined => {
  return answers.find((answer) => answer.field.id === fieldId);
};

const getTextValue = (answers: TypeformAnswer[], fieldId: string): string => {
  const answer = findAnswer(answers, fieldId);
  return answer?.text || '';
};

const getBooleanValue = (
  answers: TypeformAnswer[],
  fieldId: string
): boolean => {
  const answer = findAnswer(answers, fieldId);
  return answer?.boolean || false;
};

const getChoiceLabel = (answers: TypeformAnswer[], fieldId: string): string => {
  const answer = findAnswer(answers, fieldId);
  return answer?.choice?.label || '';
};

const getChoiceLabels = (
  answers: TypeformAnswer[], fieldId: string
): string[] => {
  const answer = findAnswer(answers, fieldId);
  return answer?.choices?.labels || [];
};

const getEmailValue = (answers: TypeformAnswer[], fieldId: string): string => {
  const answer = findAnswer(answers, fieldId);
  return answer?.email || '';
};

const getPhoneNumberValue = (
  answers: TypeformAnswer[],
  fieldId: string
): string => {
  const answer = findAnswer(answers, fieldId);
  return answer?.phone_number || '';
};

const getDateValue = (answers: TypeformAnswer[], fieldId: string): string => {
  const answer = findAnswer(answers, fieldId);
  return answer?.date || '';
};

const getFileUrl = (
  answers: TypeformAnswer[],
  fieldId: string
): string | undefined => {
  const answer = findAnswer(answers, fieldId);
  return answer?.file_url;
};

export const parseTypeformResponse = <T extends TypeformTypes>(
  response: TypeformResponse,
  formId: string
): T => {
  logger.debug('parseTypeformResponse: parsing typeform response', {
    response,
    formId,
  });
  const mapping = getTypeformMapping<T>(formId);
  if (!mapping) {
    throw new Error(`No mapping found for form ID: ${formId}`);
  }

  const answers = getAnswers(response);
  const result = {} as T;

  for (const [key, fieldId] of Object.entries(mapping.fieldMappings)) {
    const answer = findAnswer(answers, fieldId);
    if (!answer) continue;

    switch (answer.type) {
      case 'text': {
        const value = getTextValue(answers, fieldId);
        result[key as keyof T] = value as T[keyof T];
        break;
      }
      case 'boolean': {
        const value = getBooleanValue(answers, fieldId);
        result[key as keyof T] = value as T[keyof T];
        break;
      }
      case 'choice': {
        const value = getChoiceLabel(answers, fieldId);
        result[key as keyof T] = value as T[keyof T];
        break;
      }
      case 'choices': {
        const value = getChoiceLabels(answers, fieldId);
        result[key as keyof T] = value as T[keyof T];
        break;
      }
      case 'email': {
        const value = getEmailValue(answers, fieldId);
        result[key as keyof T] = value as T[keyof T];
        break;
      }
      case 'phone_number': {
        const value = getPhoneNumberValue(answers, fieldId);
        result[key as keyof T] = value as T[keyof T];
        break;
      }
      case 'date': {
        const value = getDateValue(answers, fieldId);
        result[key as keyof T] = value as T[keyof T];
        break;
      }
      case 'file_upload': {
        const value = getFileUrl(answers, fieldId);
        result[key as keyof T] = value as T[keyof T];
        break;
      }
      default: {
        // For unknown types, try to get the raw value
        const value = answer[answer.type];
        result[key as keyof T] = value as T[keyof T];
        break;
      }
    }
  }

  return result;
};
