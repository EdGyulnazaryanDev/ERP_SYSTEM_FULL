import { Button, Card, Table, Tag, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { complianceApi, type AuditLogRow } from '@/api/compliance';
import styles from './CompliancePage.module.css';

function formatUser(row: AuditLogRow): string {
  const u = row.user;
  if (!u) return '—';
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  if (name) return name;
  return u.email ?? u.id?.slice(0, 8) ?? '—';
}

function severityColor(sev: string): string {
  const s = (sev || '').toLowerCase();
  if (s === 'critical') return 'red';
  if (s === 'high') return 'volcano';
  if (s === 'medium') return 'gold';
  return 'blue';
}

export default function AuditLogsTab() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => complianceApi.getAuditLogs().then((res) => res.data),
  });

  const rows = Array.isArray(data) ? data : [];

  const columns = [
    {
      title: 'User',
      key: 'user',
      width: 180,
      ellipsis: true,
      render: (_: unknown, row: AuditLogRow) => (
        <Tooltip title={row.user?.email}>
          <span>{formatUser(row)}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 130,
      render: (action: string) => (
        <Tag color="processing" style={{ textTransform: 'capitalize' }}>
          {action}
        </Tag>
      ),
    },
    { title: 'Entity', dataIndex: 'entity_type', key: 'entity_type', ellipsis: true },
    {
      title: 'Entity ID',
      dataIndex: 'entity_id',
      key: 'entity_id',
      ellipsis: true,
      render: (id: string) => id || '—',
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 110,
      render: (severity: string) => (
        <Tag color={severityColor(severity)} style={{ textTransform: 'uppercase', fontSize: 11 }}>
          {severity}
        </Tag>
      ),
    },
    {
      title: 'When',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <div>
      <div className={styles.toolbar}>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void refetch()}
          loading={isFetching}
        >
          Refresh
        </Button>
      </div>
      <Card className={styles.sectionCard} bordered={false} title="Audit trail">
        <Table<AuditLogRow>
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '30', '50'] }}
        />
      </Card>
    </div>
  );
}
