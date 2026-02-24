import { useState } from 'react';
import { Form, Input, Button, Card, Space, Select, Switch, message, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { modulesApi, type ModuleField } from '@/api/modules';

const fieldTypes = [
  { value: 'text', label: 'Text (Short)' },
  { value: 'longtext', label: 'Text (Long)' },
  { value: 'number', label: 'Number' },
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
];

export default function ModuleBuilderPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<Partial<ModuleField>[]>([
    {
      name: 'name',
      displayName: 'Name',
      type: 'text',
      required: true,
    },
  ]);

  const createMutation = useMutation({
    mutationFn: modulesApi.createModule,
    onSuccess: () => {
      message.success('Module created successfully! Table is being created...');
      queryClient.invalidateQueries({ queryKey: ['dynamic-modules'] });
      navigate('/modules');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create module');
    },
  });

  const addField = () => {
    setFields([
      ...fields,
      {
        name: '',
        displayName: '',
        type: 'text',
        required: false,
      },
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<ModuleField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const onFinish = (values: { name: string; displayName: string; description?: string }) => {
    // Validate fields
    const invalidFields = fields.filter(f => !f.name || !f.displayName);
    if (invalidFields.length > 0) {
      message.error('All fields must have a name and display name');
      return;
    }

    createMutation.mutate({
      ...values,
      fields: fields as ModuleField[],
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create Module</h1>

      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label={
              <Space>
                Module Name
                <Tooltip title="Lowercase letters, numbers, and underscores only. Used in URLs and database.">
                  <InfoCircleOutlined />
                </Tooltip>
              </Space>
            }
            name="name"
            rules={[
              { required: true, message: 'Please enter module name' },
              { pattern: /^[a-z0-9_]+$/, message: 'Only lowercase letters, numbers, and underscores' },
            ]}
          >
            <Input placeholder="e.g., customers, products, orders" />
          </Form.Item>

          <Form.Item
            label="Display Name"
            name="displayName"
            rules={[{ required: true, message: 'Please enter display name' }]}
          >
            <Input placeholder="e.g., Customers, Products, Orders" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="What is this module for?" />
          </Form.Item>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Fields</h3>
              <Button type="dashed" icon={<PlusOutlined />} onClick={addField}>
                Add Field
              </Button>
            </div>

            <Space direction="vertical" className="w-full" size="middle">
              {fields.map((field, index) => (
                <Card key={index} size="small" className="bg-gray-50">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3">
                      <Input
                        placeholder="field_name"
                        value={field.name}
                        onChange={(e) => updateField(index, { name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                      />
                      <div className="text-xs text-gray-500 mt-1">Field name (lowercase)</div>
                    </div>
                    <div className="col-span-3">
                      <Input
                        placeholder="Display Name"
                        value={field.displayName}
                        onChange={(e) => updateField(index, { displayName: e.target.value })}
                      />
                      <div className="text-xs text-gray-500 mt-1">Label shown to users</div>
                    </div>
                    <div className="col-span-2">
                      <Select
                        className="w-full"
                        value={field.type}
                        options={fieldTypes}
                        onChange={(value) => updateField(index, { type: value as any })}
                      />
                    </div>
                    <div className="col-span-2 flex items-center">
                      <Switch
                        checked={field.required}
                        onChange={(checked) => updateField(index, { required: checked })}
                      />
                      <span className="ml-2">Required</span>
                    </div>
                    <div className="col-span-1 flex items-center">
                      <Switch
                        checked={field.unique}
                        onChange={(checked) => updateField(index, { unique: checked })}
                      />
                      <span className="ml-2">Unique</span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeField(index)}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </Space>
          </div>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={createMutation.isPending}
                disabled={fields.length === 0}
              >
                Create Module
              </Button>
              <Button onClick={() => navigate('/modules')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
