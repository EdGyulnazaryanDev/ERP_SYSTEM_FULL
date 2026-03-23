import type { Request } from 'express';
import type { JwtUser } from '../../types/express';

export interface RequestWithTenantInterface extends Request {
  user?: JwtUser;
  tenantId?: string;
}
