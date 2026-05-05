export interface TenantContext {
    tenantId: string;
    userId: string;
    role: string;
    actorType: string;
    isSystemAdmin: boolean;
}
export interface JwtPayload extends TenantContext {
    sub: string;
    email: string;
    name: string;
    principalId: string;
    iat: number;
    exp: number;
}
//# sourceMappingURL=tenant-context.types.d.ts.map