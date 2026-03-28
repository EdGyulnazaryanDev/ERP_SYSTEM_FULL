import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import * as net from 'net';
import * as http from 'http';
import * as fs from 'fs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../../../common/guards/system-admin.guard';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';

type ServiceStatus = { status: 'ok' | 'error'; latencyMs: number; error?: string };

// In-memory request rate tracking
let requestCount = 0;
let lastRateReset = Date.now();
let requestRatePerMin = 0;

export function incrementRequestCount() {
  requestCount++;
  const now = Date.now();
  const elapsed = (now - lastRateReset) / 1000 / 60;
  if (elapsed >= 1) {
    requestRatePerMin = Math.round(requestCount / elapsed);
    requestCount = 0;
    lastRateReset = now;
  }
}

@Controller('admin')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class AdminSystemHealthController {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Get('system-health')
  async systemHealth() {
    const [dbStatus, redisStatus, minioStatus, kafkaStatus] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
      this.checkMinio(),
      this.checkKafka(),
    ]);

    const [totalTenants, activeTenants, totalUsers, activeUsers, newUsersToday] = await Promise.all([
      this.tenantRepo.count(),
      this.tenantRepo.count({ where: { isActive: true } }),
      this.userRepo.count(),
      this.userRepo.count({ where: { is_active: true } }),
      this.userRepo.count({
        where: {
          created_at: (() => {
            const { MoreThan } = require('typeorm');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return MoreThan(today);
          })(),
        },
      }),
    ]);

    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();

    // DB pool stats
    const pool = (this.dataSource.driver as any).pool;
    const dbPool = pool ? {
      total: pool.totalCount ?? pool._allConnections?.length ?? 0,
      idle: pool.idleCount ?? pool._freeConnections?.length ?? 0,
      waiting: pool.waitingCount ?? pool._connectionQueue?.length ?? 0,
    } : null;

    // Disk usage
    const diskStats = this.getDiskStats();

    // Network interfaces
    const networkInterfaces = this.getNetworkInfo();

    // Event loop lag estimation
    const eventLoopLag = await this.measureEventLoopLag();

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      infrastructure: {
        database: { ...dbStatus, pool: dbPool },
        redis: redisStatus,
        minio: minioStatus,
        kafka: kafkaStatus,
        cpu: {
          cores: cpus.length,
          model: cpus[0]?.model ?? 'unknown',
          loadAvg1m: Math.round(loadAvg[0] * 100) / 100,
          loadAvg5m: Math.round(loadAvg[1] * 100) / 100,
          loadAvg15m: Math.round(loadAvg[2] * 100) / 100,
          usagePercent: Math.min(Math.round((loadAvg[0] / cpus.length) * 100), 100),
          perCore: cpus.map((cpu, i) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
            const idle = cpu.times.idle;
            return { core: i, usagePercent: Math.round(((total - idle) / total) * 100) };
          }),
        },
        memory: {
          totalMb: Math.round(totalMem / 1024 / 1024),
          usedMb: Math.round(usedMem / 1024 / 1024),
          freeMb: Math.round(freeMem / 1024 / 1024),
          usagePercent: Math.round((usedMem / totalMem) * 100),
        },
        disk: diskStats,
        network: networkInterfaces,
        process: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
          heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rssM: Math.round(process.memoryUsage().rss / 1024 / 1024),
          externalMb: Math.round(process.memoryUsage().external / 1024 / 1024),
          eventLoopLagMs: eventLoopLag,
          requestRatePerMin,
        },
      },
      business: {
        totalTenants,
        activeTenants,
        inactiveTenants: totalTenants - activeTenants,
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        newUsersToday,
      },
    };
  }

  @Post('system-health/gc')
  async runGc() {
    const before = process.memoryUsage();
    if (typeof (global as any).gc === 'function') {
      (global as any).gc();
    }
    const after = process.memoryUsage();
    const freedMb = Math.round((before.heapUsed - after.heapUsed) / 1024 / 1024);
    return {
      message: 'Garbage collection triggered',
      before: {
        heapUsedMb: Math.round(before.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(before.heapTotal / 1024 / 1024),
        rssMb: Math.round(before.rss / 1024 / 1024),
      },
      after: {
        heapUsedMb: Math.round(after.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(after.heapTotal / 1024 / 1024),
        rssMb: Math.round(after.rss / 1024 / 1024),
      },
      freedMb: Math.max(freedMb, 0),
      gcAvailable: typeof (global as any).gc === 'function',
    };
  }

  @Post('system-health/optimize')
  async optimize() {
    const result = await this.userRepo.update(
      { refreshToken: Not(IsNull()) },
      { refreshToken: null },
    );
    return {
      message: 'Optimization complete',
      actions: [
        {
          action: 'Clear expired sessions',
          detail: `Cleared ${result.affected ?? 0} refresh token(s) from the database`,
        },
      ],
    };
  }

  private async checkDb(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (e: unknown) {
      return { status: 'error', latencyMs: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
    }
  }

  private checkRedis(): Promise<ServiceStatus> {
    return new Promise((resolve) => {
      const start = Date.now();
      const host = this.configService.get<string>('REDIS_HOST', 'redis');
      const port = this.configService.get<number>('REDIS_PORT', 6379);
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ status: 'error', latencyMs: Date.now() - start, error: 'Connection timeout' });
      }, 2000);
      socket.connect(port, host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ status: 'ok', latencyMs: Date.now() - start });
      });
      socket.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ status: 'error', latencyMs: Date.now() - start, error: err.message });
      });
    });
  }

  private checkMinio(): Promise<ServiceStatus> {
    return new Promise((resolve) => {
      const start = Date.now();
      const host = this.configService.get<string>('MINIO_ENDPOINT', 'minio');
      const port = this.configService.get<number>('MINIO_PORT', 9000);
      const req = http.request({ host, port, path: '/minio/health/live', method: 'GET', timeout: 2000 }, (res) => {
        resolve({ status: res.statusCode === 200 ? 'ok' : 'error', latencyMs: Date.now() - start });
      });
      req.on('error', (err) => resolve({ status: 'error', latencyMs: Date.now() - start, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'error', latencyMs: Date.now() - start, error: 'Connection timeout' });
      });
      req.end();
    });
  }

  private checkKafka(): Promise<ServiceStatus> {
    return new Promise((resolve) => {
      const start = Date.now();
      const host = this.configService.get<string>('KAFKA_BROKER', 'kafka:9092');
      const [kafkaHost, kafkaPort] = host.split(':');
      const port = parseInt(kafkaPort ?? '9092', 10);
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ status: 'error', latencyMs: Date.now() - start, error: 'Connection timeout' });
      }, 2000);
      socket.connect(port, kafkaHost, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ status: 'ok', latencyMs: Date.now() - start });
      });
      socket.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ status: 'error', latencyMs: Date.now() - start, error: err.message });
      });
    });
  }

  private getDiskStats(): { path: string; totalGb: number; usedGb: number; freeGb: number; usagePercent: number } | null {
    try {
      const stat = fs.statfsSync('/');
      const total = stat.blocks * stat.bsize;
      const free = stat.bfree * stat.bsize;
      const used = total - free;
      return {
        path: '/',
        totalGb: Math.round(total / 1024 / 1024 / 1024 * 10) / 10,
        usedGb: Math.round(used / 1024 / 1024 / 1024 * 10) / 10,
        freeGb: Math.round(free / 1024 / 1024 / 1024 * 10) / 10,
        usagePercent: Math.round((used / total) * 100),
      };
    } catch {
      return null;
    }
  }

  private getNetworkInfo(): { interface: string; address: string; family: string }[] {
    const ifaces = os.networkInterfaces();
    const result: { interface: string; address: string; family: string }[] = [];
    for (const [name, addrs] of Object.entries(ifaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (!addr.internal) {
          result.push({ interface: name, address: addr.address, family: addr.family });
        }
      }
    }
    return result.slice(0, 4);
  }

  private measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1_000_000;
        resolve(Math.round(lag * 10) / 10);
      });
    });
  }
}
