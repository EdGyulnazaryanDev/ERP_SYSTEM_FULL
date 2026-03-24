import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Checkbox,
  Row,
  Col,
  Divider,
  Typography,
} from 'antd';
import type { CreatePlanPayload, SubscriptionPlan } from '@/api/subscriptions';

const { Text } = Typography;

const ALL_FEATURES: { key: string; label: string; group: string }[] = [
  // Core
  { key: 'dashboard',     label: 'Dashboard',         group: 'Core' },
  { key: 'products',      label: 'Products',           group: 'Core' },
  { key: 'categories',    label: 'Categories',         group: 'Core' },
  { key: 'inventory',     label: 'Inventory',          group: 'Core' },
  { key: 'transactions',  label: 'Transactions',       group: 'Core' },
  { key: 'users',         label: 'Users',              group: 'Core' },
  { key: 'settings',      label: 'Settings',           group: 'Core' },
  { key: 'rbac',          label: 'RBAC',               group: 'Core' },
  // Modules
  { key: 'accounting',    label: 'Accounting',         group: 'Modules' },
  { key: 'payments',      label: 'Payments',           group: 'Modules' },
  { key: 'crm',           label: 'CRM',                group: 'Modules' },
  { key: 'hr',            label: 'Human Resources',    group: 'Modules' },
  { key: 'procurement',   label: 'Procurement',        group: 'Modules' },
  { key: 'warehouse',     label: 'Warehouse',          group: 'Modules' },
  { key: 'transportation',label: 'Transportation',     group: 'Modules' },
  { key: 'projects',      label: 'Projects',           group: 'Modules' },
  { key: 'manufacturing', label: 'Manufacturing',      group: 'Modules' },
  { key: 'equipment',     label: 'Assets',             group: 'Modules' },
  { key: 'services',      label: 'Services',           group: 'Modules' },
  { key: 'communication', label: 'Communication',      group: 'Modules' },
  { key: 'compliance',    label: 'Compliance',         group: 'Modules' },
  { key: 'reports',       label: 'BI & Reports',       group: 'Modules' },
  { key: 'suppliers',     label: 'Suppliers',          group: 'Modules' },
];

const ALL_LIMITS: { key: string; label: string }[] = [
  { key: 'users', label: 'Max Users' },
  { key: 'products', label: 'Max Products' },
  { key: 'categories', label: 'Max Categories' },
  { key: 'transactions_per_month', label: 'Transactions / Month' },
  { key: 'storage_gb', label: 'Storage (GB)' },
];

interface PlanFormValues {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  features: string[];
  [limitKey: string]: unknown;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreatePlanPayload) => void;
  initialValues?: SubscriptionPlan | null;
  loading?: boolean;
}

export default function PlanFormModal({ open, onClose, onSubmit, initialValues, loading }: Props) {
  const [form] = Form.useForm<PlanFormValues>();
  const isEdit = !!initialValues;

  useEffect(() => {
    if (open) {
      if (initialValues) {
        const limitFields: Record<string, number | null> = {};
        ALL_LIMITS.forEach(({ key }) => {
          limitFields[`limit_${key}`] = initialValues.limits[key] ?? null;
        });
        form.setFieldsValue({
          name: initialValues.name,
          description: initialValues.description ?? undefined,
          monthlyPrice: initialValues.pricing.monthly,
          yearlyPrice: initialValues.pricing.yearly,
          isActive: initialValues.isActive ?? true,
          features: initialValues.features,
          ...limitFields,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ isActive: true, features: [] });
      }
    }
  }, [open, initialValues, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const limits = ALL_LIMITS.map(({ key }) => ({
      key: key as import('@/api/subscriptions').PlanLimitKey,
      value: (values[`limit_${key}`] as number | null | undefined) ?? null,
    }));

    onSubmit({
      name: values.name,
      description: values.description,
      monthlyPrice: values.monthlyPrice,
      yearlyPrice: values.yearlyPrice,
      isActive: values.isActive,
      features: values.features as import('@/api/subscriptions').PlanFeature[],
      limits,
    });
  };

  return (
    <Modal
      title={isEdit ? 'Edit Plan' : 'Create Plan'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? 'Save Changes' : 'Create Plan'}
      confirmLoading={loading}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="name"
              label="Plan Name"
              rules={[{ required: true, message: 'Plan name is required' }]}
            >
              <Input placeholder="e.g. Pro" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} placeholder="Short description of this plan" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="monthlyPrice"
              label="Monthly Price ($)"
              rules={[
                { required: true, message: 'Monthly price is required' },
                { type: 'number', min: 0, message: 'Price must be non-negative' },
              ]}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="yearlyPrice"
              label="Yearly Price ($)"
              rules={[
                { required: true, message: 'Yearly price is required' },
                { type: 'number', min: 0, message: 'Price must be non-negative' },
              ]}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        <Form.Item name="features" label="Included Pages / Modules">
          <Checkbox.Group style={{ width: '100%' }}>
            {(['Core', 'Modules'] as const).map((group) => (
              <div key={group} style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  {group}
                </Text>
                <Row gutter={[8, 6]}>
                  {ALL_FEATURES.filter((f) => f.group === group).map(({ key, label }) => (
                    <Col span={8} key={key}>
                      <Checkbox value={key}>{label}</Checkbox>
                    </Col>
                  ))}
                </Row>
              </div>
            ))}
          </Checkbox.Group>
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Resource Limits — leave blank for unlimited
        </Text>

        <Row gutter={[16, 8]}>
          {ALL_LIMITS.map(({ key, label }) => (
            <Col span={12} key={key}>
              <Form.Item name={`limit_${key}`} label={label} style={{ marginBottom: 8 }}>
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="Unlimited"
                />
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Form>
    </Modal>
  );
}
