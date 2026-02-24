import { Request } from 'express';

export interface JwtUser {
  sub: string;
  tenantId: string;
  email: string;
}

declare module 'express' {
  interface Request {
    user?: JwtUser;
    tenantId?: string;
  }
}
