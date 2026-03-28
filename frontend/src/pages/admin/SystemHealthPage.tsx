import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Card, Row, Col, Progress, Statistic, Tag, Button, Spin, Alert,
  Descriptions, Typography, Badge, Tooltip, Modal, notification, Switch,
} from 'antd';
import {
  ReloadOutlined, DatabaseOutlined, ThunderboltOutlined,
  DashboardOutlined, CloudServerOutlined, TeamOutlined,
  UserOutlined, WarningOutlined, RocketOutlined, ClearOutlined,
  HddOutlined, WifiOutlined, ApiOutlined, ClockCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, NodeIndexOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminSystemHealthApi } from '@/api/admin';

const { Text, Title } = Typography;

const MAX_HISTORY = 30;
const REFRESH_INTERVALS = [1, 1_000, 10_000, 30_000, 60_000, 300_000];
const REFRESH_LABELS = ['1ms', '1s', '10s', '30s', '1m', '5m'];

const cardStyle = {
  background: 'rgba(8,25,40,0.6)',
  border: '1px solid rgba(134,166,197,0.12)',
  borderRadius: 14,
};

const formatUptime = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
};

function Sparkline({ values, color, height = 36, width = 120 }: { values: number[]; color: string; height?: number; width?: number }) {
  if (values.length < 2) return <div style={{ height }} />;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const fillPts = `0,${height} ${pts} ${width},${height}`;
  const gradId = `sg-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function PulseDot({ status }: { status: 'ok' | 'error' | 'unknown' }) {
  const color = status === 'ok' ? '#52c41a' : status === 'error' ? '#ff4d4f' : '#fa8c16';
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14 }}>
      <span style={{
        position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: color, opacity: 0.3,
        animation: status === 'ok' ? 'pulse 2s ease-in-out infinite' : 'none',
      }} />
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, position: 'relative' }} />
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.8);opacity:0}}`}</style>
    </span>
  );
}

function ServiceCard({
  icon, label, status, latencyMs, error, extra,
}: {
  icon: React.ReactNode; label: string; status: 'ok' | 'error';
  latencyMs: number; error?: string; extra?: React.ReactNode;
}) {
  const latencyColor = latencyMs < 10 ? '#52c41a' : latencyMs < 50 ? '#fa8c16' : '#ff4d4f';
  return (
    <Card size="small" style={{ ...cardStyle, borderColor: status === 'error' ? 'rgba(255,77,79,0.3)' : 'rgba(134,166,197,0.12)', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PulseDot status={status} />
          {icon}
          <Text style={{ color: '#f0f6ff', fontWeight: 600 }}>{label}</Text>
        </span>
        {status === 'ok'
          ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
          : <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#88a0b9', fontSize: 11 }}>Latency</Text>
        <Text style={{ color: latencyColor, fontSize: 13, fontWeight: 700 }}>{latencyMs}ms</Text>
      </div>
      {extra}
      {error && <Alert type="error" message={error} style={{ marginTop: 6, fontSize: 11 }} showIcon />}
    </Card>
  );
}

function MetricCard({
  title, value, unit, percent, color, history, warning, critical, subtitle,
}: {
  title: string; value: string; unit?: string; percent: number; color: string;
  history: number[]; warning: number; critical: number; subtitle?: string;
}) {
  const isWarning = percent >= warning && percent < critical;
  const isCritical = percent >= critical;
  const strokeColor = isCritical ? '#ff4d4f' : isWarning ? '#fa8c16' : color;
  return (
    <Card size="small" style={{ ...cardStyle, borderColor: isCritical ? 'rgba(255,77,79,0.3)' : isWarning ? 'rgba(250,140,22,0.3)' : 'rgba(134,166,197,0.12)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <Text style={{ color: '#88a0b9', fontSize: 11, display: 'block', marginBottom: 2 }}>{title}</Text>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ color: '#f0f6ff', fontSize: 22, fontWeight: 700 }}>{value}</Text>
            {unit && <Text style={{ color: '#88a0b9', fontSize: 12 }}>{unit}</Text>}
          </div>
          {subtitle && <Text style={{ color: '#88a0b9', fontSize: 10 }}>{subtitle}</Text>}
        </div>
        <div style={{ textAlign: 'right' }}>
          {(isWarning || isCritical) && (
            <WarningOutlined style={{ color: strokeColor, fontSize: 14, marginBottom: 4, display: 'block' }} />
          )}
          <Sparkline values={history} color={strokeColor} />
        </div>
      </div>
      <Progress percent={percent} strokeColor={strokeColor} trailColor="rgba(255,255,255,0.06)" showInfo={false} size="small" style={{ marginBottom: 0 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: '#88a0b9', fontSize: 10 }}>0%</Text>
        <Text style={{ color: strokeColor, fontSize: 11, fontWeight: 600 }}>{percent}%</Text>
        <Text style={{ color: '#88a0b9', fontSize: 10 }}>100%</Text>
      </div>
    </Card>
  );
}

function StatBox({ label, value, color, icon }: { label: string; value: string | number; color: string; icon?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px' }}>
      {icon && <div style={{ marginBottom: 4, color }}>{icon}</div>}
      <Text style={{ color, fontSize: 22, fontWeight: 700, display: 'block' }}>{value}</Text>
      <Text style={{ color: '#88a0b9', fontSize: 11 }}>{label}</Text>
    </div>
  );
}

export default function SystemHealthPage() {
  const cpuHistory = useRef<number[]>([]);
  const memHistory = useRef<number[]>([]);
  const heapHistory = useRef<number[]>([]);
  const dbLatencyHistory = useRef<number[]>([]);
  const redisLatencyHistory = useRef<number[]>([]);
  const eventLoopHistory = useRef<number[]>([]);
  const reqRateHistory = useRef<number[]>([]);

  const [refreshIdx, setRefreshIdx] = useState(3); // default 30s
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => adminSystemHealthApi.get().then(r => r.data),
    refetchInterval: autoRefresh ? REFRESH_INTERVALS[refreshIdx] : false,
  });

  const optimizeMutation = useMutation({
    mutationFn: () => adminSystemHealthApi.optimize().then(r => r.data),
    onSuccess: (result) => {
      notification.success({
        message: 'Optimization complete',
        description: (result.actions as { detail: string }[])?.map(a => a.detail).join('\n'),
        duration: 6,
      });
      refetch();
    },
    onError: () => notification.error({ message: 'Optimization failed' }),
  });

  const gcMutation = useMutation({
    mutationFn: () => adminSystemHealthApi.gc().then(r => r.data),
    onSuccess: (result) => {
      if (!result.gcAvailable) {
        notification.warning({ message: 'GC not available', description: 'Restart with --expose-gc flag.', duration: 8 });
      } else {
        notification.success({
          message: `Freed ${result.freedMb} MB of heap memory`,
          description: `Heap: ${result.before.heapUsedMb} MB → ${result.after.heapUsedMb} MB`,
          duration: 6,
        });
      }
      refetch();
    },
    onError: () => notification.error({ message: 'GC failed' }),
  });

  const pushHistory = useCallback((ref: React.MutableRefObject<number[]>, val: number) => {
    ref.current = [...ref.current, val].slice(-MAX_HISTORY);
  }, []);

  useEffect(() => {
    if (!data) return;
    const { infrastructure: inf } = data;
    pushHistory(cpuHistory, inf.cpu.usagePercent);
    pushHistory(memHistory, inf.memory.usagePercent);
    pushHistory(heapHistory, Math.round((inf.process.heapUsedMb / inf.process.heapTotalMb) * 100));
    pushHistory(dbLatencyHistory, inf.database.latencyMs);
    pushHistory(redisLatencyHistory, inf.redis.latencyMs);
    pushHistory(eventLoopHistory, inf.process.eventLoopLagMs ?? 0);
    pushHistory(reqRateHistory, inf.process.requestRatePerMin ?? 0);
  }, [data, dataUpdatedAt, pushHistory]);

  if (isLoading) return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  if (!data) return null;

  const { infrastructure: inf, business, uptimeSeconds } = data;

  const services = [
    { key: 'db', icon: <DatabaseOutlined style={{ color: '#1677ff' }} />, label: 'PostgreSQL', ...inf.database, latencyHistory: dbLatencyHistory.current },
    { key: 'redis', icon: <ThunderboltOutlined style={{ color: '#fa8c16' }} />, label: 'Redis', ...inf.redis, latencyHistory: redisLatencyHistory.current },
    { key: 'minio', icon: <CloudServerOutlined style={{ color: '#722ed1' }} />, label: 'MinIO', ...(inf.minio ?? { status: 'error', latencyMs: 0 }), latencyHistory: [] },
    { key: 'kafka', icon: <NodeIndexOutlined style={{ color: '#13c2c2' }} />, label: 'Kafka', ...(inf.kafka ?? { status: 'error', latencyMs: 0 }), latencyHistory: [] },
  ];

  const allServicesOk = services.every(s => s.status === 'ok');
  const hasAlerts = !allServicesOk || inf.cpu.usagePercent >= 80 || inf.memory.usagePercent >= 85 || (inf.process.eventLoopLagMs ?? 0) > 100;

  const alertMessages = [
    !allServicesOk && `Service(s) down: ${services.filter(s => s.status !== 'ok').map(s => s.label).join(', ')}.`,
    inf.cpu.usagePercent >= 80 && `High CPU: ${inf.cpu.usagePercent}%.`,
    inf.memory.usagePercent >= 85 && `High memory: ${inf.memory.usagePercent}%.`,
    (inf.process.eventLoopLagMs ?? 0) > 100 && `Event loop lag: ${inf.process.eventLoopLagMs}ms.`,
  ].filter(Boolean).join(' ');

  const heapPercent = Math.round((inf.process.heapUsedMb / inf.process.heapTotalMb) * 100);
  const diskPercent = inf.disk?.usagePercent ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#f8fbff' }}>System Health</Title>
          <Text style={{ color: '#88a0b9', fontSize: 12 }}>
            Updated {new Date(dataUpdatedAt).toLocaleTimeString()} · {autoRefresh ? `auto-refresh ${REFRESH_LABELS[refreshIdx]}` : 'auto-refresh off'}
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#88a0b9', fontSize: 12 }}>Auto</Text>
            <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
            {autoRefresh && REFRESH_LABELS.map((label, i) => (
              <Tooltip key={label} title={i === 0 ? '⚠️ 1ms will flood the backend with ~1000 req/s. Use with caution.' : undefined}>
                <Tag
                  style={{ cursor: 'pointer', margin: 0, background: i === refreshIdx ? 'rgba(22,119,255,0.2)' : 'transparent', borderColor: i === refreshIdx ? '#1677ff' : i === 0 ? 'rgba(255,77,79,0.4)' : 'rgba(134,166,197,0.2)', color: i === refreshIdx ? '#1677ff' : i === 0 ? '#ff4d4f' : '#88a0b9' }}
                  onClick={() => setRefreshIdx(i)}
                >
                  {label}
                </Tag>
              </Tooltip>
            ))}
          </div>
          <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()} size="small">Refresh</Button>
          <Tooltip title="Clears expired sessions from the database">
            <Button icon={<RocketOutlined />} loading={optimizeMutation.isPending} size="small"
              onClick={() => Modal.confirm({
                title: 'Run System Optimization?',
                content: 'Clears expired refresh tokens. Active sessions are not affected.',
                okText: 'Optimize',
                onOk: () => optimizeMutation.mutate(),
              })}>Optimize</Button>
          </Tooltip>
          <Tooltip title="Triggers Node.js garbage collection">
            <Button icon={<ClearOutlined />} loading={gcMutation.isPending} size="small"
              onClick={() => Modal.confirm({
                title: 'Clear Node.js Heap?',
                content: 'Triggers GC to free unused heap memory. Server stays online.',
                okText: 'Clear RAM',
                onOk: () => gcMutation.mutate(),
              })}>Clear RAM</Button>
          </Tooltip>
        </div>
      </div>

      {/* Alert banner */}
      {hasAlerts && (
        <Alert type="warning" showIcon message="System Alert" description={alertMessages} style={{ borderRadius: 12 }} />
      )}

      {/* Overall status bar */}
      <Card size="small" style={{ ...cardStyle, background: allServicesOk ? 'rgba(82,196,26,0.06)' : 'rgba(255,77,79,0.06)', borderColor: allServicesOk ? 'rgba(82,196,26,0.2)' : 'rgba(255,77,79,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PulseDot status={allServicesOk ? 'ok' : 'error'} />
            <Text style={{ color: allServicesOk ? '#52c41a' : '#ff4d4f', fontWeight: 700, fontSize: 14 }}>
              {allServicesOk ? 'All Systems Operational' : 'Degraded Performance'}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ClockCircleOutlined style={{ color: '#88a0b9' }} />
              <Text style={{ color: '#f0f6ff', fontSize: 13 }}>Uptime: <strong>{formatUptime(uptimeSeconds)}</strong></Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ApiOutlined style={{ color: '#88a0b9' }} />
              <Text style={{ color: '#f0f6ff', fontSize: 13 }}>Req/min: <strong>{inf.process.requestRatePerMin ?? 0}</strong></Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ThunderboltOutlined style={{ color: '#88a0b9' }} />
              <Text style={{ color: '#f0f6ff', fontSize: 13 }}>Event loop: <strong style={{ color: (inf.process.eventLoopLagMs ?? 0) > 100 ? '#ff4d4f' : '#52c41a' }}>{inf.process.eventLoopLagMs ?? 0}ms</strong></Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Services */}
      <Row gutter={[12, 12]}>
        {services.map(svc => (
          <Col xs={24} sm={12} lg={6} key={svc.key}>
            <ServiceCard
              icon={svc.icon}
              label={svc.label}
              status={svc.status as 'ok' | 'error'}
              latencyMs={svc.latencyMs}
              error={svc.error}
              extra={svc.latencyHistory.length > 1 ? (
                <div style={{ marginTop: 6 }}>
                  <Sparkline values={svc.latencyHistory} color={svc.status === 'ok' ? '#1677ff' : '#ff4d4f'} height={24} width={100} />
                </div>
              ) : undefined}
            />
          </Col>
        ))}
      </Row>

      {/* DB Pool */}
      {inf.database.pool && (
        <Card size="small" style={cardStyle}>
          <Text style={{ color: '#88a0b9', fontSize: 11, display: 'block', marginBottom: 8 }}>
            <DatabaseOutlined style={{ marginRight: 6 }} />PostgreSQL Connection Pool
          </Text>
          <Row gutter={[16, 0]}>
            <Col span={8}><StatBox label="Total" value={inf.database.pool.total} color="#1677ff" /></Col>
            <Col span={8}><StatBox label="Idle" value={inf.database.pool.idle} color="#52c41a" /></Col>
            <Col span={8}><StatBox label="Waiting" value={inf.database.pool.waiting} color={inf.database.pool.waiting > 0 ? '#fa8c16' : '#88a0b9'} /></Col>
          </Row>
        </Card>
      )}

      {/* CPU + Memory */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <MetricCard
            title="CPU Usage"
            value={`${inf.cpu.usagePercent}`}
            unit="%"
            subtitle={`${inf.cpu.cores} cores · Load ${inf.cpu.loadAvg1m} / ${inf.cpu.loadAvg5m} / ${inf.cpu.loadAvg15m}`}
            percent={inf.cpu.usagePercent}
            color="#22d3ee"
            history={cpuHistory.current}
            warning={60}
            critical={80}
          />
          {inf.cpu.perCore && inf.cpu.perCore.length > 0 && (
            <Card size="small" style={{ ...cardStyle, marginTop: 8 }}>
              <Text style={{ color: '#88a0b9', fontSize: 11, display: 'block', marginBottom: 8 }}>Per-core usage</Text>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(inf.cpu.perCore.length, 8)}, 1fr)`, gap: 6 }}>
                {(inf.cpu.perCore as { core: number; usagePercent: number }[]).map(core => {
                  const c = core.usagePercent >= 80 ? '#ff4d4f' : core.usagePercent >= 60 ? '#fa8c16' : '#22d3ee';
                  return (
                    <div key={core.core} style={{ textAlign: 'center' }}>
                      <Text style={{ color: '#88a0b9', fontSize: 10, display: 'block' }}>C{core.core}</Text>
                      <Progress type="circle" percent={core.usagePercent} size={40} strokeColor={c} trailColor="rgba(255,255,255,0.06)"
                        format={p => <span style={{ color: c, fontSize: 9, fontWeight: 700 }}>{p}%</span>} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </Col>
        <Col xs={24} md={12}>
          <MetricCard
            title="System Memory"
            value={`${inf.memory.usedMb}`}
            unit="MB"
            subtitle={`${inf.memory.freeMb} MB free of ${inf.memory.totalMb} MB total`}
            percent={inf.memory.usagePercent}
            color="#a78bfa"
            history={memHistory.current}
            warning={70}
            critical={85}
          />
          <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
            <Col span={12}>
              <MetricCard
                title="Node.js Heap"
                value={`${inf.process.heapUsedMb}`}
                unit="MB"
                subtitle={`of ${inf.process.heapTotalMb} MB`}
                percent={heapPercent}
                color="#34d399"
                history={heapHistory.current}
                warning={70}
                critical={85}
              />
            </Col>
            <Col span={12}>
              <MetricCard
                title="Event Loop Lag"
                value={`${inf.process.eventLoopLagMs ?? 0}`}
                unit="ms"
                subtitle="lower is better"
                percent={Math.min(Math.round(((inf.process.eventLoopLagMs ?? 0) / 200) * 100), 100)}
                color="#f59e0b"
                history={eventLoopHistory.current}
                warning={50}
                critical={75}
              />
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Disk + Network + Process */}
      <Row gutter={[12, 12]}>
        {inf.disk && (
          <Col xs={24} md={8}>
            <Card size="small" style={cardStyle}>
              <Text style={{ color: '#88a0b9', fontSize: 11, display: 'block', marginBottom: 8 }}>
                <HddOutlined style={{ marginRight: 6 }} />Disk — {inf.disk.path}
              </Text>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <Text style={{ color: '#f0f6ff', fontSize: 20, fontWeight: 700 }}>{inf.disk.usedGb} GB</Text>
                <Text style={{ color: '#88a0b9', fontSize: 11 }}>of {inf.disk.totalGb} GB</Text>
              </div>
              <Progress
                percent={diskPercent}
                strokeColor={diskPercent >= 90 ? '#ff4d4f' : diskPercent >= 75 ? '#fa8c16' : '#60a5fa'}
                trailColor="rgba(255,255,255,0.06)"
                showInfo={false}
                size="small"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ color: '#88a0b9', fontSize: 10 }}>{inf.disk.freeGb} GB free</Text>
                <Text style={{ color: diskPercent >= 90 ? '#ff4d4f' : '#60a5fa', fontSize: 11, fontWeight: 600 }}>{diskPercent}%</Text>
              </div>
            </Card>
          </Col>
        )}
        <Col xs={24} md={inf.disk ? 8 : 12}>
          <Card size="small" style={cardStyle}>
            <Text style={{ color: '#88a0b9', fontSize: 11, display: 'block', marginBottom: 8 }}>
              <WifiOutlined style={{ marginRight: 6 }} />Network Interfaces
            </Text>
            {inf.network && (inf.network as { interface: string; address: string; family: string }[]).length > 0 ? (
              inf.network.map((n: { interface: string; address: string; family: string }, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#88a0b9', fontSize: 11 }}>{n.interface} ({n.family})</Text>
                  <Text style={{ color: '#f0f6ff', fontSize: 11, fontFamily: 'monospace' }}>{n.address}</Text>
                </div>
              ))
            ) : (
              <Text style={{ color: '#88a0b9', fontSize: 11 }}>No external interfaces</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={inf.disk ? 8 : 12}>
          <Card size="small" style={cardStyle}>
            <Text style={{ color: '#88a0b9', fontSize: 11, display: 'block', marginBottom: 8 }}>
              <DashboardOutlined style={{ marginRight: 6 }} />Process Info
            </Text>
            <Descriptions size="small" column={2} colon={false}>
              {[
                ['Node.js', inf.process.nodeVersion],
                ['Platform', `${inf.process.platform} (${inf.process.arch})`],
                ['PID', inf.process.pid],
                ['RSS', `${inf.process.rssM} MB`],
                ['External', `${inf.process.externalMb} MB`],
                ['Cores', inf.cpu.cores],
              ].map(([label, val]) => (
                <Descriptions.Item key={String(label)} label={<Text style={{ color: '#88a0b9', fontSize: 11 }}>{label}</Text>}>
                  <Text style={{ color: '#f0f6ff', fontSize: 11 }}>{val}</Text>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Request Rate sparkline */}
      <Card size="small" style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#88a0b9', fontSize: 11 }}>
            <ApiOutlined style={{ marginRight: 6 }} />Request Rate (req/min)
          </Text>
          <Text style={{ color: '#f0f6ff', fontSize: 18, fontWeight: 700 }}>{inf.process.requestRatePerMin ?? 0}</Text>
        </div>
        <Sparkline values={reqRateHistory.current} color="#818cf8" height={48} width={600} />
      </Card>

      {/* Business Metrics */}
      <Card size="small" style={cardStyle} title={<Text style={{ color: '#f0f6ff', fontWeight: 600 }}>Business Metrics</Text>}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={4}>
            <Statistic
              title={<span style={{ color: '#88a0b9', fontSize: 12 }}>Total Tenants</span>}
              value={business.totalTenants}
              prefix={<TeamOutlined style={{ color: '#1677ff', marginRight: 4 }} />}
              valueStyle={{ color: '#f0f6ff', fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic
              title={<span style={{ color: '#88a0b9', fontSize: 12 }}>Active Tenants</span>}
              value={business.activeTenants}
              prefix={<Badge status="success" style={{ marginRight: 4 }} />}
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic
              title={<span style={{ color: '#88a0b9', fontSize: 12 }}>Inactive Tenants</span>}
              value={business.inactiveTenants}
              prefix={<Badge status="default" style={{ marginRight: 4 }} />}
              valueStyle={{ color: '#88a0b9', fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic
              title={<span style={{ color: '#88a0b9', fontSize: 12 }}>Total Users</span>}
              value={business.totalUsers}
              prefix={<UserOutlined style={{ color: '#a78bfa', marginRight: 4 }} />}
              valueStyle={{ color: '#a78bfa', fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic
              title={<span style={{ color: '#88a0b9', fontSize: 12 }}>Active Users</span>}
              value={business.activeUsers ?? 0}
              prefix={<Badge status="processing" style={{ marginRight: 4 }} />}
              valueStyle={{ color: '#34d399', fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic
              title={<span style={{ color: '#88a0b9', fontSize: 12 }}>New Today</span>}
              value={business.newUsersToday ?? 0}
              prefix={<UserOutlined style={{ color: '#f59e0b', marginRight: 4 }} />}
              valueStyle={{ color: '#f59e0b', fontSize: 22 }}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
}
