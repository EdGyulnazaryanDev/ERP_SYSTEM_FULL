export interface IServiceClient {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
}

export interface ServiceCallOptions {
  tenantId: string;
  token: string;
  requestId?: string;
}
