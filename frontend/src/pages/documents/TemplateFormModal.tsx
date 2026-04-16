import { useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  Switch, 
  Button, 
  Space,
  Divider,
  Typography,
  Row,
  Col,
  InputNumber,
  message
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { type DocumentTemplate, type CreateTemplatePayload, type TemplateVariable } from '@/api/documents';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Props {
  open: boolean;
  template: DocumentTemplate | null;
  onClose: () => void;
  onSubmit: (data: CreateTemplatePayload) => void;
  loading?: boolean;
}

export default function TemplateFormModal({ open, template, onClose, onSubmit, loading }: Props) {
  const [form] = Form.useForm();
  const isEdit = !!template;

  const handleAddVariable = () => {
    const variables = form.getFieldValue('variables') || [];
    form.setFieldsValue({
      variables: [...variables, {
        name: '',
        type: 'string',
        required: false,
        defaultValue: '',
      }]
    });
  };

  const handleRemoveVariable = (index: number) => {
    const variables = form.getFieldValue('variables') || [];
    form.setFieldsValue({
      variables: variables.filter((_: unknown, i: number) => i !== index)
    });
  };

  return (
    <Modal
      title={isEdit ? 'Edit Template' : 'Create Template'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          outputFormats: ['pdf'],
          isActive: true,
          variables: [],
          ...template,
        }}
        onFinish={(values) => {
          onSubmit(values);
        }}
      >
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="name"
              label="Template Name"
              rules={[{ required: true, message: 'Template name is required' }]}
            >
              <Input placeholder="e.g. Employment Contract" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: 'Category is required' }]}
        >
          <Select placeholder="Select category">
            <Select.Option value="employment">Employment</Select.Option>
            <Select.Option value="payroll">Payroll</Select.Option>
            <Select.Option value="financial">Financial</Select.Option>
            <Select.Option value="shipping">Shipping</Select.Option>
            <Select.Option value="legal">Legal</Select.Option>
            <Select.Option value="other">Other</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="templateType"
          label="Template Type"
          rules={[{ required: true, message: 'Template type is required' }]}
        >
          <Select placeholder="Select template type">
            <Select.Option value="html">HTML</Select.Option>
            <Select.Option value="markdown">Markdown</Select.Option>
            <Select.Option value="json">JSON</Select.Option>
            <Select.Option value="docx">DOCX</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="outputFormats"
          label="Output Formats"
          rules={[{ required: true, message: 'At least one output format is required' }]}
        >
          <Select mode="multiple" placeholder="Select output formats">
            <Select.Option value="pdf">PDF</Select.Option>
            <Select.Option value="html">HTML</Select.Option>
            <Select.Option value="json">JSON</Select.Option>
            <Select.Option value="docx">DOCX</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="templateContent"
          label="Template Content"
          rules={[{ required: true, message: 'Template content is required' }]}
        >
          <TextArea 
            rows={12} 
            placeholder="Enter your template content with {{variable}} placeholders..."
          />
        </Form.Item>

        <Divider>Template Variables</Divider>

        <Form.List name="variables">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <div key={key} style={{ marginBottom: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 6 }}>
                  <Row gutter={16} align="middle">
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        label="Variable Name"
                        rules={[{ required: true, message: 'Variable name is required' }]}
                      >
                        <Input placeholder="e.g. employee.name" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'type']}
                        label="Type"
                        rules={[{ required: true, message: 'Type is required' }]}
                      >
                        <Select>
                          <Select.Option value="string">String</Select.Option>
                          <Select.Option value="number">Number</Select.Option>
                          <Select.Option value="date">Date</Select.Option>
                          <Select.Option value="boolean">Boolean</Select.Option>
                          <Select.Option value="array">Array</Select.Option>
                          <Select.Option value="object">Object</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...restField}
                        name={[name, 'required']}
                        label="Required"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        {...restField}
                        name={[name, 'defaultValue']}
                        label="Default Value"
                      >
                        <Input placeholder="Optional default value" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => remove(name)}
                        style={{ marginTop: 24 }}
                      />
                    </Col>
                  </Row>
                </div>
              ))}
              <Form.Item>
                <Button 
                  type="dashed" 
                  onClick={() => add()} 
                  icon={<PlusOutlined />}
                  style={{ width: '100%' }}
                >
                  Add Variable
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
