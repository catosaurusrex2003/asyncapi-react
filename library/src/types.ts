import { AsyncAPIDocumentInterface, BaseModel } from '@asyncapi/parser';

export type PropsSchema =
  | string
  | FetchingSchemaInterface
  | AsyncAPIDocumentInterface
  | object;

export type NullableAsyncApi = AsyncAPIDocumentInterface | null;

export interface AsyncApiState {
  validatedSchema: NullableAsyncApi;
  error?: ErrorObject;
}

export function isFetchingSchemaInterface(
  schema: PropsSchema,
): schema is FetchingSchemaInterface {
  return (schema as FetchingSchemaInterface).url !== undefined;
}

export interface FetchingSchemaInterface {
  url: string;
  requestOptions?: RequestInit;
}

export interface ParserReturn {
  asyncapi?: AsyncAPIDocumentInterface;
  error?: ErrorObject;
}

export enum PayloadType {
  SEND = 'send',
  RECEIVE = 'receive',
  REQUEST = 'request',
  REPLY = 'reply',
}

export interface MessageExample {
  name?: string;
  summary?: string;
  example: unknown;
}

export interface ValidationError {
  title: string;
  location?: {
    jsonPointer: string;
    startLine: number;
    startColumn: number;
    startOffset: number;
    endLine: number;
    endColumn: number;
    endOffset: number;
  };
}

export interface ErrorObject {
  type: string;
  title: string;
  detail?: string;
  parsedJSON?: unknown;
  validationErrors?: ValidationError[];
  location?: {
    startLine: number;
    startColumn: number;
    startOffset: number;
  };
  refs?: {
    title: string;
    jsonPointer: string;
    startLine: number;
    startColumn: number;
    startOffset: number;
    endLine: number;
    endColumn: number;
    endOffset: number;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ExtensionComponentProps<V = any> {
  propertyName: string;
  propertyValue: V;
  document: AsyncAPIDocumentInterface;
  parent: BaseModel;
}
