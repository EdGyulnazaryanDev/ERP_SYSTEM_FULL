import { Request } from 'express';
import type { JwtPayload } from '../modules/auth/interfaces/jwt-payload.interface';

export interface JwtUser extends JwtPayload {
  /** Same as `sub`; set by JWT strategy for controllers using `req.user.userId`. */
  userId?: string;
}

declare module 'express' {
  interface Request {
    user?: JwtUser;
    tenantId?: string;
  }
}
