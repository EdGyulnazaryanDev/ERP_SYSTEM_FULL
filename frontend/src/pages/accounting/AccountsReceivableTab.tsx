import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tooltip,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileDoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SignatureOutlined,
  UploadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { accountingApi } from '@/api/accounting';
import { crmApi } from '@/api/crm';

const COLLECTION_CFG: Record<string, { color: string; bg: string; label: string }> = {
  open: { color: '#fa8c16', bg: '#fff7e6', label: 'OPEN' },
  partially_paid: { color: '#1677ff', bg: '#e6f4ff', label: 'PARTIAL' },
  paid: { color: '#52c41a', bg: '#f6ffed', label: 'PAID' },
  overdue: { color: '#ff4d4f', bg: '#fff2f0', label: 'OVERDUE' },
  written_off: { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', label: 'WRITTEN OFF' },
  rejected: { color: '#ff4d4f', bg: '#fff2f0', label: 'REJECTED' },
};

const APPROVAL_CFG: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', label: 'DRAFT' },
  pending_approval: { color: '#fa8c16', bg: '#fff7e6', label: 'PENDING APPROVAL' },
  approved: { color: '#52c41a', bg: '#f6ffed', label: 'APPROVED' },
  rejected: { color: '#ff4d4f', bg: '#fff2f0', label: 'REJECTED' },
};

const POSTING_CFG: Record<string, { color: string; bg: string; label: string }> = {
  unposted: { color: '#1677ff', bg: '#e6f4ff', label: 'UNPOSTED' },
  posted: { color: '#52c41a', bg: '#f6ffed', label: 'POSTED' },
};

const ACK_CFG: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', label: 'UNSIGNED' },
  signed: { color: '#52c41a', bg: '#f6ffed', label: 'SIGNED' },
  rejected: { color: '#ff4d4f', bg: '#fff2f0', label: 'DECLINED' },
};

function StatusPill({
  value,
  config,
}: {
  value: string;
  config: Record<string, { color: string; bg: string; label: string }>;
}) {
  const cfg = config[value] ?? {
    color: 'var(--app-text-muted)',
    bg: 'rgba(255,255,255,0.04)',
    label: value?.toUpperCase(),
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 20,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}33`,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

function generateInvoiceNumber(dateValue: dayjs.Dayjs | null | undefined, invoices: any[]) {
  const date = dateValue || dayjs();
  const prefix = `INV-${date.format('YYYYMM')}-`;
  const matchingSequence = invoices
    .map((invoice) => String(invoice.invoice_number || ''))
    .filter((invoiceNumber) => invoiceNumber.startsWith(prefix))
    .map((invoiceNumber) => {
      const suffix = invoiceNumber.slice(prefix.length);
      const parsed = Number.parseInt(suffix, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });

  const nextSequence = (matchingSequence.length ? Math.max(...matchingSequence) : 0) + 1;
  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
}

export default function AccountsReceivableTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [signForm] = Form.useForm();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isSignModalVisible, setIsSignModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
    queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['accounts-receivable'],
    queryFn: () => accountingApi.getAccountsReceivable().then((res) => res.data),
  });

  const { data: customersRaw = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => crmApi.getCustomers().then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => accountingApi.createAR(payload),
    onSuccess: () => {
      message.success('Invoice draft created');
      setIsCreateModalVisible(false);
      form.resetFields();
      invalidateAll();
    },
    onError: (error: any) =>
      message.error(error?.response?.data?.message || 'Failed to create invoice'),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => accountingApi.submitAR(id),
    onSuccess: () => {
      message.success('Invoice submitted for approval');
      invalidateAll();
    },
    onError: (error: any) =>
      message.error(error?.response?.data?.message || 'Failed to submit invoice'),
  });

  const approveMutation = useMutation({
    mutationFn: (payload: { id: string; notes?: string }) =>
      accountingApi.approveAR(payload.id, { notes: payload.notes }),
    onSuccess: () => {
      message.success('Invoice approved');
      invalidateAll();
    },
    onError: (error: any) =>
      message.error(error?.response?.data?.message || 'Failed to approve invoice'),
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { id: string; notes?: string }) =>
      accountingApi.rejectAR(payload.id, { notes: payload.notes }),
    onSuccess: () => {
      message.success('Invoice rejected');
      invalidateAll();
    },
    onError: (error: any) =>
      message.error(error?.response?.data?.message || 'Failed to reject invoice'),
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => accountingApi.postAR(id),
    onSuccess: () => {
      message.success('Invoice posted to accounting');
      invalidateAll();
    },
    onError: (error: any) =>
      message.error(error?.response?.data?.message || 'Failed to post invoice'),
  });

  const signMutation = useMutation({
    mutationFn: (payload: { id: string; signed_by_name: string; notes?: string }) =>
      accountingApi.signAR(payload.id, payload),
    onSuccess: () => {
      message.success('Invoice signed');
      setIsSignModalVisible(false);
      signForm.resetFields();
      setSelectedInvoice(null);
      invalidateAll();
    },
    onError: (error: any) =>
      message.error(error?.response?.data?.message || 'Failed to sign invoice'),
  });

  const customerList = Array.isArray(customersRaw)
    ? customersRaw
    : (customersRaw as any)?.data || [];
  const customerOptions = customerList.map((customer: any) => ({
    label:
      customer.company_name ||
      `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
      customer.name ||
      customer.id,
    value: customer.id,
  }));

  const rawList: any[] = Array.isArray(data) ? data : (data as any)?.data || [];
  const filtered = statusFilter
    ? rawList.filter(
        (row) =>
          row.status === statusFilter ||
          row.approval_status === statusFilter ||
          row.posting_status === statusFilter ||
          row.acknowledgement_status === statusFilter,
      )
    : rawList;

  const overdueCount = rawList.filter((row) => row.status === 'overdue').length;
  const totalBalance = rawList.reduce(
    (sum, row) => sum + Number(row.balance_amount || 0),
    0,
  );

  const applyGeneratedInvoiceNumber = (dateValue?: dayjs.Dayjs | null) => {
    form.setFieldValue('invoice_number', generateInvoiceNumber(dateValue, rawList));
  };

  const handleCreate = (values: any) => {
    createMutation.mutate({
      customer_id: values.customer_id,
      invoice_number: values.invoice_number,
      invoice_date: values.invoice_date?.format('YYYY-MM-DD'),
      due_date: values.due_date?.format('YYYY-MM-DD'),
      amount: Number(values.amount),
      description: values.description,
    });
  };

  const openRejectDialog = (record: any) => {
    let notes = '';
    Modal.confirm({
      title: `Reject ${record.invoice_number}?`,
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Reason for rejection"
          onChange={(event) => {
            notes = event.target.value;
          }}
        />
      ),
      okText: 'Reject',
      okButtonProps: { danger: true },
      onOk: () => rejectMutation.mutate({ id: record.id, notes }),
    });
  };

  const openSignRequest = (record: any) => {
    setSelectedInvoice(record);
    setIsSignModalVisible(true);
    signForm.setFieldsValue({
      signed_by_name: record.customer_name || '',
      notes: '',
    });
  };

  const renderInvoiceActions = (record: any) => (
    <Space wrap size={6}>
      {record.approval_status === 'draft' && (
        <Button
          size="small"
          icon={<UploadOutlined />}
          onClick={() => submitMutation.mutate(record.id)}
          loading={submitMutation.isPending}
        >
          Submit
        </Button>
      )}
      {['draft', 'pending_approval'].includes(record.approval_status) && (
        <Button
          size="small"
          icon={<SafetyCertificateOutlined />}
          onClick={() => approveMutation.mutate({ id: record.id })}
          loading={approveMutation.isPending}
        >
          Approve
        </Button>
      )}
      {['draft', 'pending_approval', 'approved'].includes(record.approval_status) &&
        record.posting_status !== 'posted' && (
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => openRejectDialog(record)}
            loading={rejectMutation.isPending}
          >
            Reject
          </Button>
        )}
      {record.approval_status === 'approved' && record.posting_status === 'unposted' && (
        <Button
          type="primary"
          size="small"
          icon={<FileDoneOutlined />}
          onClick={() => postMutation.mutate(record.id)}
          loading={postMutation.isPending}
        >
          Post
        </Button>
      )}
      {record.posting_status === 'posted' && record.acknowledgement_status !== 'signed' && (
        <Button
          size="small"
          icon={<SendOutlined />}
          onClick={() => openSignRequest(record)}
        >
          Request Sign
        </Button>
      )}
      {record.posting_status === 'posted' && record.acknowledgement_status === 'signed' && (
        <Button size="small" icon={<CheckCircleOutlined />} disabled>
          Signed
        </Button>
      )}
    </Space>
  );

  return (
    <div>
      {rawList.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            {
              label: 'Draft / Waiting Approval',
              value: rawList.filter((row) =>
                ['draft', 'pending_approval'].includes(row.approval_status),
              ).length,
              color: '#fa8c16',
            },
            {
              label: 'Approved / Unposted',
              value: rawList.filter(
                (row) =>
                  row.approval_status === 'approved' &&
                  row.posting_status === 'unposted',
              ).length,
              color: '#1677ff',
            },
            {
              label: 'Posted Exposure',
              value: rawList
                .filter((row) => row.posting_status === 'posted')
                .reduce((sum, row) => sum + Number(row.balance_amount || 0), 0),
              color: '#52c41a',
            },
            {
              label: 'Unsigned Posted',
              value: rawList.filter(
                (row) =>
                  row.posting_status === 'posted' &&
                  row.acknowledgement_status !== 'signed',
              ).length,
              color: '#722ed1',
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                flex: '1 1 160px',
                padding: '10px 16px',
                borderRadius: 10,
                background: `linear-gradient(135deg, ${color}14 0%, rgba(8, 25, 40, 0.58) 100%)`,
                border: `1px solid ${color}22`,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--app-text-muted)' }}>{label}</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color }}>
                {label === 'Posted Exposure'
                  ? `$${Number(value || 0).toFixed(2)}`
                  : Number(value || 0)}
              </div>
            </div>
          ))}
        </div>
      )}

      {overdueCount > 0 && (
        <Alert
          message={`${overdueCount} overdue invoice(s) — total outstanding: $${totalBalance.toFixed(2)}`}
          type="warning"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Space>
          <ClockCircleOutlined style={{ color: '#1677ff', fontSize: 16 }} />
          <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>
            {filtered.length} invoices
          </span>
          <Select
            placeholder="All lifecycle states"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            size="small"
            options={[
              { label: 'Draft', value: 'draft' },
              { label: 'Pending Approval', value: 'pending_approval' },
              { label: 'Approved', value: 'approved' },
              { label: 'Rejected', value: 'rejected' },
              { label: 'Posted', value: 'posted' },
              { label: 'Signed', value: 'signed' },
              { label: 'Overdue', value: 'overdue' },
              { label: 'Paid', value: 'paid' },
            ]}
          />
        </Space>
        <Space>
          <Tooltip title="Refresh">
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={invalidateAll}
            />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ borderRadius: 8 }}
            onClick={() => {
              setIsCreateModalVisible(true);
              form.resetFields();
              const draftDate = dayjs();
              form.setFieldValue('invoice_date', draftDate);
              applyGeneratedInvoiceNumber(draftDate);
            }}
          >
            New Invoice Draft
          </Button>
        </Space>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {filtered.map((record) => (
          <Card
            key={record.id}
            size="small"
            style={{
              borderRadius: 16,
              background: 'rgba(8, 25, 40, 0.6)',
              border: '1px solid rgba(134, 166, 197, 0.12)',
            }}
            styles={{ body: { padding: 16 } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>
                    {record.invoice_number}
                  </span>
                  <StatusPill value={record.status} config={COLLECTION_CFG} />
                  <StatusPill value={record.approval_status} config={APPROVAL_CFG} />
                  <StatusPill value={record.posting_status} config={POSTING_CFG} />
                  <StatusPill value={record.acknowledgement_status} config={ACK_CFG} />
                </div>
                <div style={{ marginTop: 8, color: 'var(--app-text)', fontWeight: 600 }}>
                  {record.customer_name || record.customer_id || '—'}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--app-text-muted)' }}>
                  Invoice {dayjs(record.invoice_date).format('MMM DD, YYYY')} • Due {record.due_date ? dayjs(record.due_date).format('MMM DD, YYYY') : 'Auto by terms'}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--app-text-soft)' }}>
                  {record.description || 'No description'}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10, minWidth: 240, flex: '1 1 280px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                  <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(82, 196, 26, 0.08)', border: '1px solid rgba(82, 196, 26, 0.16)' }}>
                    <div style={{ fontSize: 11, color: 'var(--app-text-muted)' }}>Total</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, marginTop: 4 }}>${Number(record.total_amount || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(22, 119, 255, 0.08)', border: '1px solid rgba(22, 119, 255, 0.16)' }}>
                    <div style={{ fontSize: 11, color: 'var(--app-text-muted)' }}>Outstanding</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, marginTop: 4 }}>${Number(record.balance_amount || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(250, 140, 22, 0.08)', border: '1px solid rgba(250, 140, 22, 0.16)' }}>
                    <div style={{ fontSize: 11, color: 'var(--app-text-muted)' }}>Workflow</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>
                      {record.posting_status === 'posted'
                        ? record.acknowledgement_status === 'signed'
                          ? 'Posted + Signed'
                          : 'Posted, waiting sign'
                        : record.approval_status === 'approved'
                          ? 'Ready to post'
                          : record.approval_status === 'pending_approval'
                            ? 'Waiting approval'
                            : 'Draft'}
                    </div>
                  </div>
                </div>

                {renderInvoiceActions(record)}
              </div>
            </div>
          </Card>
        ))}

        {!isLoading && filtered.length === 0 && (
          <Card size="small" style={{ borderRadius: 16 }}>
            <div style={{ color: 'var(--app-text-muted)' }}>No invoices match the current filter.</div>
          </Card>
        )}
      </div>

      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#1677ff' }} />
            New Invoice Draft
          </Space>
        }
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="customer_id" label="Customer" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select customer"
              options={customerOptions}
            />
          </Form.Item>
          <Form.Item name="invoice_number" label="Invoice Number" rules={[{ required: true }]}>
            <Input
              placeholder="Auto-generated invoice number"
              addonAfter={
                <Button
                  type="link"
                  size="small"
                  style={{ paddingInline: 0 }}
                  onClick={() => applyGeneratedInvoiceNumber(form.getFieldValue('invoice_date'))}
                >
                  Generate
                </Button>
              }
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="invoice_date"
                label="Invoice Date"
                rules={[{ required: true }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  onChange={(value) => {
                    const currentInvoiceNumber = form.getFieldValue('invoice_number');
                    if (!currentInvoiceNumber || currentInvoiceNumber.startsWith('INV-')) {
                      applyGeneratedInvoiceNumber(value);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="due_date" label="Due Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <Input type="number" min={0} step="0.01" prefix="$" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsCreateModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Save Draft
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <SignatureOutlined style={{ color: '#52c41a' }} />
            Signature Request {selectedInvoice?.invoice_number}
          </Space>
        }
        open={isSignModalVisible}
        onCancel={() => {
          setIsSignModalVisible(false);
          setSelectedInvoice(null);
          signForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={signForm}
          layout="vertical"
          onFinish={(values) => {
            if (!selectedInvoice) {
              return;
            }
            signMutation.mutate({
              id: selectedInvoice.id,
              signed_by_name: values.signed_by_name,
              notes: values.notes,
            });
          }}
        >
          <Form.Item
            name="signed_by_name"
            label="Signed By"
            rules={[{ required: true, message: 'Signer name is required' }]}
          >
            <Input placeholder="Customer representative name" />
          </Form.Item>
          <Form.Item name="notes" label="Signature Notes">
            <Input.TextArea rows={3} placeholder="Optional acknowledgment notes" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsSignModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={signMutation.isPending}>
                Save Signature
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
