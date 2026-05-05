export interface IKafkaEvent<T = unknown> {
  eventId: string;
  eventType: string;
  tenantId: string;
  timestamp: string;
  sourceService: string;
  payload: T;
}
