import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ConfigProvider,
  Tabs,
  Typography,
  theme,
  Spin,
  Row,
  Col,
} from 'antd';
import {
  SafetyCertificateOutlined,
  FileSearchOutlined,
  UnlockOutlined,
  ControlOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { complianceApi } from '@/api/compliance';
import AuditLogsTab from './AuditLogsTab';
import AccessLogsTab from './AccessLogsTab';
import GovernanceTab from './GovernanceTab';
import styles from './CompliancePage.module.css';

const { Title, Paragraph } = Typography;

export default function CompliancePage() {
  const { darkAlgorithm } = theme;

  const statsRange = useMemo(() => {
    const end = dayjs().endOf('day');
    const start = dayjs().subtract(30, 'day').startOf('day');
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, []);

  const statsQuery = useQuery({
    queryKey: ['compliance-audit-stats', statsRange.start, statsRange.end],
    queryFn: () =>
      complianceApi
        .getAuditStatistics(statsRange.start, statsRange.end)
        .then((r) => r.data),
  });
  const accessLogsQuery = useQuery({
    queryKey: ['compliance-access-overview'],
    queryFn: () => complianceApi.getAccessLogs().then((r) => r.data),
  });
  const rulesQuery = useQuery({
    queryKey: ['compliance-rules-overview'],
    queryFn: () => complianceApi.getRules().then((r) => r.data),
  });
  const checksQuery = useQuery({
    queryKey: ['compliance-checks-overview'],
    queryFn: () => complianceApi.getChecks().then((r) => r.data),
  });

  const total = statsQuery.data?.total_logs ?? '—';
  const topAction = statsQuery.data?.by_action
    ? Object.entries(statsQuery.data.by_action).sort((a, b) => b[1] - a[1])[0]
    : null;
  const deniedAccessCount = (accessLogsQuery.data ?? []).filter((row) => row.result !== 'granted').length;
  const activeRules = (rulesQuery.data ?? []).filter((row) => row.status === 'active').length;
  const failedChecks = (checksQuery.data ?? []).filter((row) => row.status === 'failed').length;

  const items = [
    {
      key: 'audit-logs',
      label: (
        <span>
          <FileSearchOutlined /> Audit logs
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          <AuditLogsTab />
        </div>
      ),
    },
    {
      key: 'governance',
      label: (
        <span>
          <ControlOutlined /> Governance
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          <GovernanceTab />
        </div>
      ),
    },
    {
      key: 'access-logs',
      label: (
        <span>
          <UnlockOutlined /> Access logs
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          <AccessLogsTab />
        </div>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm, token: { colorPrimary: '#34d399' } }}>
      <div className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.heroInner}>
            <Title level={1} className={styles.heroTitle}>
              Compliance & audit
            </Title>
            <Paragraph className={styles.heroSubtitle}>
              Immutable trail of security-relevant actions and resource access. Review authentication
              events, data changes, and access outcomes for audits and investigations.
            </Paragraph>
            <div className={styles.statsRow}>
              <div className={styles.statChip}>
                <div className={styles.statChipLabel}>Last 30 days</div>
                <div className={styles.statChipValue}>
                  {statsQuery.isLoading ? <Spin size="small" /> : total}
                </div>
                <div className={styles.secondaryText} style={{ fontSize: 12, marginTop: 4 }}>
                  Audit events recorded
                </div>
              </div>
              <div className={styles.statChip}>
                <div className={styles.statChipLabel}>Top action</div>
                <div
                  className={styles.statChipValue}
                  style={{ fontSize: '1.1rem', fontWeight: 600, textTransform: 'capitalize' }}
                >
                  {statsQuery.isLoading ? (
                    <Spin size="small" />
                  ) : topAction ? (
                    `${topAction[0]} (${topAction[1]})`
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div className={styles.statChip}>
                <div className={styles.statChipLabel}>Coverage</div>
                <div className={styles.statChipValue} style={{ fontSize: '1.05rem' }}>
                  {activeRules} rules active
                </div>
                <div className={styles.secondaryText} style={{ fontSize: 12, marginTop: 4 }}>
                  {failedChecks} failed checks, {deniedAccessCount} risky access outcomes
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.content}>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={8}>
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.12)',
                  background: 'rgba(15,23,42,0.4)',
                }}
              >
                <SafetyCertificateOutlined style={{ color: '#34d399', fontSize: 22, marginBottom: 8 }} />
                <div style={{ color: '#e2e8f0', fontWeight: 600 }}>Evidence-ready</div>
                <div className={styles.secondaryText} style={{ fontSize: 13, marginTop: 4 }}>
                  Logs include actor, entity, severity, and timestamps for regulatory review.
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.12)',
                  background: 'rgba(15,23,42,0.4)',
                }}
              >
                <FileSearchOutlined style={{ color: '#a78bfa', fontSize: 22, marginBottom: 8 }} />
                <div style={{ color: '#e2e8f0', fontWeight: 600 }}>Change tracking</div>
                <div className={styles.secondaryText} style={{ fontSize: 13, marginTop: 4 }}>
                  Audit stream captures create, update, delete, login, and export-style actions.
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: 12,
                  border: '1px solid rgba(148,163,184,0.12)',
                  background: 'rgba(15,23,42,0.4)',
                }}
              >
                <UnlockOutlined style={{ color: '#38bdf8', fontSize: 22, marginBottom: 8 }} />
                <div style={{ color: '#e2e8f0', fontWeight: 600 }}>Access outcomes</div>
                <div className={styles.secondaryText} style={{ fontSize: 13, marginTop: 4 }}>
                  Access logs record granted vs denied checks on sensitive resources.
                </div>
              </div>
            </Col>
          </Row>
          <Tabs className={styles.tabs} size="large" items={items} />
        </div>
      </div>
    </ConfigProvider>
  );
}
