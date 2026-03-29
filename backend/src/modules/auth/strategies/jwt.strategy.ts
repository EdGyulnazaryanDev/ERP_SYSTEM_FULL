import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { Tenant } from '../../tenants/tenant.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<JwtPayload & { userId: string }> {
    // System admins have no tenant — always allow
    if (payload.isSystemAdmin || !payload.tenantId) {
      return { ...payload, userId: payload.sub };
    }

    // Check tenant is still active
    const tenant = await this.tenantRepo.findOne({
      where: { id: payload.tenantId },
    });

    if (!tenant || tenant.isActive === false) {
      throw new UnauthorizedException('TENANT_DEACTIVATED');
    }

    return { ...payload, userId: payload.sub };
  }
}
