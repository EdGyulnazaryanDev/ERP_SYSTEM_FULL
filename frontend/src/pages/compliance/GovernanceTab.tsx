import { Card, Col, Progress, Row, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  complianceApi,
  type ComplianceCheckRow,
  type ComplianceReportRow,
  type ComplianceRuleRow,
  type RetentionPolicyRow,
} from '@/api/compliance';
import styles from './CompliancePage.module.css';

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'passed' || s === 'completed') return 'success';
  if (s === 'failed' || s === 'critical') return 'error';
  if (s === 'warning' || s === 'draft' || s === 'processing' || s === 'generating') return 'warning';
  return 'default';
}

export default function GovernanceTab() {
  const rulesQuery = useQuery({
    queryKey: ['compliance-rules'],
    queryFn: () => complianceApi.getRules().then((res) => res.data),
  });
  const checksQuery = useQuery({
    queryKey: ['compliance-checks'],
    queryFn: () => complianceApi.getChecks().then((res) => res.data),
  });
  const policiesQuery = useQuery({
    queryKey: ['compliance-policies'],
    queryFn: () => complianceApi.getPolicies().then((res) => res.data),
  });
  const reportsQuery = useQuery({
    queryKey: ['compliance-reports'],
    queryFn: () => complianceApi.getReports().then((res) => res.data),
  });

  const rules = rulesQuery.data ?? [];
  const checks = checksQuery.data ?? [];
  const policies = policiesQuery.data ?? [];
  const reports = reportsQuery.data ?? [];

  const activeRules = rules.filter((rule) => rule.status === 'active').length;
  const failedChecks = checks.filter((check) => check.status === 'failed').length;
  const automatedPolicies = policies.filter((policy) => policy.auto_execute).length;
  const completedReports = reports.filter((report) => report.status === 'completed').length;
  const policyCoverage = pct(
    policies.filter((policy) => policy.status === 'active').length,
    policies.length,
  );
  const passRate = pct(
    checks.filter((check) => check.status === 'passed').length,
    checks.length,
  );

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={6}>
            <Card className={styles.sectionCard} bordered={false}>
              <div className={styles.statChipLabel}>Rule activation</div>
              <div className={styles.statChipValue}>{activeRules}/{rules.length || 0}</div>
              <Progress percent={pct(activeRules, rules.length)} showInfo={false} strokeColor="#34d399" />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Card className={styles.sectionCard} bordered={false}>
              <div className={styles.statChipLabel}>Check pass rate</div>
              <div className={styles.statChipValue}>{passRate}%</div>
              <Progress percent={passRate} showInfo={false} strokeColor="#38bdf8" />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Card className={styles.sectionCard} bordered={false}>
              <div className={styles.statChipLabel}>Auto-run policies</div>
              <div className={styles.statChipValue}>{automatedPolicies}</div>
              <div className={styles.secondaryText}>of {policies.length || 0} retention policies</div>
            </Card>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Card className={styles.sectionCard} bordered={false}>
              <div className={styles.statChipLabel}>Evidence packs</div>
              <div className={styles.statChipValue}>{completedReports}</div>
              <div className={styles.secondaryText}>{failedChecks} failed checks need attention</div>
            </Card>
          </Col>
        </Row>
      </Col>

      <Col xs={24} xl={12}>
        <Card className={styles.sectionCard} bordered={false} title="Compliance rules">
          <Table<ComplianceRuleRow>
            size="small"
            rowKey="id"
            loading={rulesQuery.isLoading}
            dataSource={rules}
            scroll={{ x: 900 }}
            pagination={{ pageSize: 6 }}
            columns={[
              {
                title: 'Rule',
                key: 'rule',
                render: (_value, row) => (
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{row.rule_name}</div>
                    <div className={styles.secondaryText}>{row.rule_code}</div>
                  </div>
                ),
              },
              {
                title: 'Framework',
                dataIndex: 'framework',
                key: 'framework',
                render: (value: string) => <Tag>{value.toUpperCase()}</Tag>,
              },
              {
                title: 'Type',
                dataIndex: 'rule_type',
                key: 'rule_type',
                render: (value: string) => <Tag color="processing">{value.replaceAll('_', ' ')}</Tag>,
              },
              {
                title: 'Priority',
                dataIndex: 'priority',
                key: 'priority',
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag>,
              },
              {
                title: 'Updated',
                dataIndex: 'updated_at',
                key: 'updated_at',
                render: (value: string) => dayjs(value).format('YYYY-MM-DD'),
              },
            ]}
          />
        </Card>
      </Col>

      <Col xs={24} xl={12}>
        <Card className={styles.sectionCard} bordered={false} title="Check execution">
          <Table<ComplianceCheckRow>
            size="small"
            rowKey="id"
            loading={checksQuery.isLoading}
            dataSource={checks}
            scroll={{ x: 900 }}
            pagination={{ pageSize: 6 }}
            columns={[
              {
                title: 'Rule',
                key: 'rule',
                render: (_value, row) => row.rule?.rule_name ?? 'Unknown rule',
              },
              {
                title: 'Framework',
                key: 'framework',
                render: (_value, row) => row.rule?.framework ? <Tag>{row.rule.framework.toUpperCase()}</Tag> : '—',
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag>,
              },
              {
                title: 'Violations',
                dataIndex: 'violations_count',
                key: 'violations_count',
              },
              {
                title: 'Runtime',
                dataIndex: 'execution_time_ms',
                key: 'execution_time_ms',
                render: (value?: number) => (value ? `${value} ms` : '—'),
              },
              {
                title: 'Checked',
                dataIndex: 'checked_at',
                key: 'checked_at',
                render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
              },
            ]}
          />
        </Card>
      </Col>

      <Col xs={24} xl={12}>
        <Card className={styles.sectionCard} bordered={false} title="Retention controls">
          <div className={styles.secondaryText} style={{ marginBottom: 12 }}>
            Active policy coverage: {policyCoverage}% of configured data domains.
          </div>
          <Table<RetentionPolicyRow>
            size="small"
            rowKey="id"
            loading={policiesQuery.isLoading}
            dataSource={policies}
            scroll={{ x: 900 }}
            pagination={{ pageSize: 6 }}
            columns={[
              {
                title: 'Policy',
                dataIndex: 'policy_name',
                key: 'policy_name',
              },
              {
                title: 'Entity',
                dataIndex: 'entity_type',
                key: 'entity_type',
              },
              {
                title: 'Retention',
                key: 'retention_days',
                render: (_value, row) => `${row.retention_days} days`,
              },
              {
                title: 'Action',
                dataIndex: 'action',
                key: 'action',
                render: (value: string) => <Tag color="purple">{value}</Tag>,
              },
              {
                title: 'Auto',
                dataIndex: 'auto_execute',
                key: 'auto_execute',
                render: (value: boolean) => (value ? <Tag color="cyan">Enabled</Tag> : 'Manual'),
              },
              {
                title: 'Processed',
                dataIndex: 'records_processed',
                key: 'records_processed',
              },
            ]}
          />
        </Card>
      </Col>

      <Col xs={24} xl={12}>
        <Card className={styles.sectionCard} bordered={false} title="Compliance reports">
          <Table<ComplianceReportRow>
            size="small"
            rowKey="id"
            loading={reportsQuery.isLoading}
            dataSource={reports}
            scroll={{ x: 900 }}
            pagination={{ pageSize: 6 }}
            columns={[
              {
                title: 'Report',
                dataIndex: 'report_name',
                key: 'report_name',
              },
              {
                title: 'Type',
                dataIndex: 'report_type',
                key: 'report_type',
                render: (value: string) => <Tag color="processing">{value.replaceAll('_', ' ')}</Tag>,
              },
              {
                title: 'Framework',
                dataIndex: 'framework',
                key: 'framework',
                render: (value?: string) => (value ? <Tag>{value.toUpperCase()}</Tag> : '—'),
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag>,
              },
              {
                title: 'Window',
                key: 'window',
                render: (_value, row) =>
                  `${dayjs(row.start_date).format('MMM D')} - ${dayjs(row.end_date).format('MMM D')}`,
              },
              {
                title: 'Generated',
                dataIndex: 'generated_at',
                key: 'generated_at',
                render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}
