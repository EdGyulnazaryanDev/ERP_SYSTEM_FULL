import { Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, message, Popconfirm, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/api/crm';
import { useState } from 'react';
import dayjs from 'dayjs';

export default function OpportunitiesTab() {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: opportunitiesRes, isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => crmApi.getOpportunities().then(res => res.data),
  });

  const { data: customersRes } = useQuery({
    queryKey: ['customers'],
    queryFn: () => crmApi.getCustomers().then(res => res.data),
  });

  const customers = Array.isArray(customersRes) ? customersRes : (customersRes?.data || []);
  const data = Array.isArray(opportunitiesRes) ? opportunitiesRes : (opportunitiesRes?.data || []);

  const createMutation = useMutation({
    mutationFn: (data: any) => crmApi.createOpportunity(data),
    onSuccess: () => {
      message.success('Opportunity created successfully');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create opportunity');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => crmApi.updateOpportunity(id, data),
    onSuccess: () => {
      message.success('Opportunity updated successfully');
      setIsModalVisible(false);
      setEditingOpportunity(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update opportunity');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteOpportunity(id),
    onSuccess: () => {
      message.success('Opportunity deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete opportunity');
    }
  });

  const handleAdd = () => {
    setEditingOpportunity(null);
    setIsModalVisible(true);
    setTimeout(() => {
      form.resetFields();
    }, 0);
  };

  const handleEdit = (record: any) => {
    setEditingOpportunity(record);
    setIsModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        ...record,
        expected_close_date: record.expected_close_date ? dayjs(record.expected_close_date) : null,
      });
    }, 0);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      const payload = {
        ...values,
        expected_close_date: values.expected_close_date ? values.expected_close_date.toISOString() : undefined,
      };

      if (editingOpportunity) {
        updateMutation.mutate({ id: editingOpportunity.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const columns = [
    { title: 'Code', dataIndex: 'opportunity_code', key: 'opportunity_code' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Customer', dataIndex: 'customer', key: 'customer', render: (customer: any) => customer?.company_name },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (val: number) => val != null ? `$${Number(val).toFixed(2)}` : '-' },
    { title: 'Probability', dataIndex: 'probability', key: 'probability', render: (prob: number) => prob != null ? `${prob}%` : '-' },
    { title: 'Stage', dataIndex: 'stage', key: 'stage', render: (stage: string) => <Tag color="purple">{stage}</Tag> },
    { title: 'Expected Close', dataIndex: 'expected_close_date', key: 'expected_close_date', render: (date: string) => date ? new Date(date).toLocaleDateString() : '-' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Delete this opportunity?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Opportunities</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Opportunity</Button>
      </div>
      <Table columns={columns} dataSource={data} loading={isLoading} rowKey="id" />

      <Modal
        title={editingOpportunity ? "Edit Opportunity" : "Add Opportunity"}
        open={isModalVisible}
        forceRender
        onOk={handleModalOk}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
      >
        <Form form={form} layout="vertical" className="grid grid-cols-2 gap-x-4">
          <Form.Item name="opportunity_code" label="Opportunity Code" rules={[{ required: true }]}>
            <Input disabled={!!editingOpportunity} />
          </Form.Item>
          <Form.Item name="name" label="Opportunity Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="customer_id" label="Customer" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="children"
              options={customers.map((c: any) => ({ value: c.id, label: c.company_name }))}
            />
          </Form.Item>
          <Form.Item name="stage" label="Stage" rules={[{ required: true }]}>
            <Select options={[
              { value: 'prospecting', label: 'Prospecting' },
              { value: 'qualification', label: 'Qualification' },
              { value: 'proposal', label: 'Proposal' },
              { value: 'negotiation', label: 'Negotiation' },
              { value: 'closed_won', label: 'Closed Won' },
              { value: 'closed_lost', label: 'Closed Lost' },
            ]} />
          </Form.Item>
          <Form.Item name="amount" label="Amount">
            <InputNumber className="w-full" min={0} precision={2} />
          </Form.Item>
          <Form.Item name="probability" label="Probability (%)">
            <InputNumber className="w-full" min={0} max={100} />
          </Form.Item>
          <Form.Item name="expected_close_date" label="Expected Close Date">
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="description" label="Description" className="col-span-2">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
