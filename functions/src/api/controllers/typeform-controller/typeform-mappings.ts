import { TYPEFORM_IDS } from '../../../core/config/typeform-ids';
import { TrialDayFormData } from '../../../core/data/models';

// Define a union type of all possible form types
export type TypeformTypes = TrialDayFormData; // Add more form types here with union |

interface TypeformMapping<T extends TypeformTypes> {
    formId: string;
    formType: T;
    fieldMappings: Record<keyof T, string>;
  }

const typeformMappings: TypeformMapping<TypeformTypes>[] = [
  {
    formId: TYPEFORM_IDS.TRIAL_DAY,
    formType: {} as TrialDayFormData, // Type marker, not used at runtime
    fieldMappings: {
      preferredDate: 'xX6TSIEnqNkj',
      preferredTime: '2f1qDhLbEreM',
      interest: 'brD0397XKxgY',
      reason: 'N6pJKM0zzVVd',
      firstName: '58FFWHi8po79',
      lastName: 'XUENCAcrtf9g',
      phoneNumber: 'o1R8yNOgN89r',
      email: 'pgTkoA9mDEAT',
      legal: 'mm48WXKiBVWg',
    } as Record<keyof TrialDayFormData, string>,
  },
];

export function getTypeformMapping<T extends TypeformTypes>(
  formId: string
): TypeformMapping<T> | undefined {
  return typeformMappings.find(
    (mapping): mapping is TypeformMapping<T> => mapping.formId === formId
  );
}
