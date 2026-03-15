import { Table, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SwapOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/api/crm';
import { useState } from 'react';
import dayjs from 'dayjs';

export default function LeadsTab() {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => crmApi.getLeads().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => crmApi.createLead(data),
    onSuccess: () => {
      message.success('Lead created successfully');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create lead');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => crmApi.updateLead(id, data),
    onSuccess: () => {
      message.success('Lead updated successfully');
      setIsModalVisible(false);
      setEditingLead(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update lead');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteLead(id),
    onSuccess: () => {
      message.success('Lead deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete lead');
    }
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => crmApi.convertLeadToCustomer(id),
    onSuccess: () => {
      message.success('Lead converted to customer successfully');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to convert lead');
    }
  });

  const handleAdd = () => {
    setEditingLead(null);
    setIsModalVisible(true);
    setTimeout(() => {
      form.resetFields();
    }, 0);
  };

  const handleEdit = (record: any) => {
    setEditingLead(record);
    setIsModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        ...record,
        next_follow_up: record.next_follow_up ? dayjs(record.next_follow_up) : null,
      });
    }, 0);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleConvert = (id: string) => {
    convertMutation.mutate(id);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      const payload = {
        ...values,
        next_follow_up: values.next_follow_up ? values.next_follow_up.toISOString() : undefined,
      };

      if (editingLead) {
        updateMutation.mutate({ id: editingLead.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const columns = [
    { title: 'Code', dataIndex: 'lead_code', key: 'lead_code' },
    { title: 'Company', dataIndex: 'company_name', key: 'company_name' },
    { title: 'Contact Person', dataIndex: 'contact_person', key: 'contact_person' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Source', dataIndex: 'source', key: 'source', render: (src: string) => src ? <Tag>{src}</Tag> : null },
    { title: 'Score', dataIndex: 'score', key: 'score' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => {
        if (!status) return null;
        let color = 'blue';
        if (status === 'won') color = 'green';
        if (status === 'lost') color = 'red';
        if (status === 'qualified') color = 'cyan';
        if (status === 'proposal') color = 'orange';
        if (status === 'negotiation') color = 'purple';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          {record.status !== 'won' && (
            <Popconfirm title="Convert to customer?" onConfirm={() => handleConvert(record.id)}>
              <Button icon={<SwapOutlined />} size="small" title="Convert to Customer" />
            </Popconfirm>
          )}
          <Popconfirm
            title="Delete this lead?"
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
        <h2 className="text-xl font-semibold">Leads</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Lead</Button>
      </div>
      <Table columns={columns} dataSource={data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingLead ? "Edit Lead" : "Add Lead"}
        open={isModalVisible}
        forceRender
        onOk={handleModalOk}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
      >
        <Form form={form} layout="vertical" className="grid grid-cols-2 gap-x-4">
          <Form.Item name="lead_code" label="Lead Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="company_name" label="Company Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contact_person" label="Contact Person" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Position">
            <Input />
          </Form.Item>
          <Form.Item name="source" label="Source">
            <Select options={[
              { value: 'website', label: 'Website' },
              { value: 'referral', label: 'Referral' },
              { value: 'cold_call', label: 'Cold Call' },
              { value: 'trade_show', label: 'Trade Show' },
              { value: 'campaign', label: 'Campaign' },
              { value: 'social_media', label: 'Social Media' },
              { value: 'other', label: 'Other' },
            ]} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[
              { value: 'new', label: 'New' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'qualified', label: 'Qualified' },
              { value: 'proposal', label: 'Proposal' },
              { value: 'negotiation', label: 'Negotiation' },
              { value: 'won', label: 'Won' },
              { value: 'lost', label: 'Lost' },
            ]} />
          </Form.Item>
          <Form.Item name="score" label="Score">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="expected_revenue" label="Expected Revenue">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="probability" label="Probability (%)">
            <Input type="number" max={100} min={0} />
          </Form.Item>
          <Form.Item name="next_follow_up" label="Next Follow Up">
            <DatePicker className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
