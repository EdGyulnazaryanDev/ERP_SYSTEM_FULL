export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  actorType: 'staff' | 'customer' | 'supplier';
  principalId: string;
  role?: string;
  name?: string;
  isSystemAdmin?: boolean;
}
