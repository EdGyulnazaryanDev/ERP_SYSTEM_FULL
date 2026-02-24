import type { Request } from 'express';
import type { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

export interface RequestWithTenantInterface extends Request {
  user: JwtPayload;
  tenantId: string;
}
