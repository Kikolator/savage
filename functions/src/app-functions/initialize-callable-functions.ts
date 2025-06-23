import { CallableFunction } from 'firebase-functions/https';

export type CallableV2Function = {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: CallableFunction<any, any>;
};

export type AddCallableFunction = (params: CallableV2Function) => void;

export interface InitializeCallableFunctions {
    initialize(add: AddCallableFunction): void;
}