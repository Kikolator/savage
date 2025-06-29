import {DocumentData} from 'firebase-admin/firestore';

export interface SetDoc {
  data: DocumentData;
  collection: string;
  documentId?: string;
  merge?: boolean;
}
