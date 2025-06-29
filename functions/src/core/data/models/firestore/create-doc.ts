import {DocumentData} from 'firebase-admin/firestore';

export interface CreateDoc {
  data: DocumentData;
  collection: string;
  documentId?: string;
}
