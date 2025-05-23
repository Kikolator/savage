export {};

declare global {
    namespace Express {
        interface Request {
            typeformSignature?: string;
            rawBody?: string;
        }
    }
}

