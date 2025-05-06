import { DocumentData } from 'firebase-admin/firestore';

export interface UpdateDoc {
    collection: string,
    documentId: string,
    data: DocumentData,
}
