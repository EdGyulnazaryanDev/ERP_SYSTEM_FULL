import { useState } from 'react';
import { 
  Modal, 
  Form, 
  Select, 
  Button, 
  Typography,
  Space,
  Alert,
  Card,
  Input,
  Divider
} from 'antd';
import { type DocumentTemplate, type GenerateDocumentPayload } from '@/api/documents';

const { Title, Text } = Typography;

interface Props {
  open: boolean;
  templates: DocumentTemplate[];
  onClose: () => void;
  onSubmit: (data: GenerateDocumentPayload) => void;
  loading?: boolean;
}

export default function GenerateDocumentModal({ open, templates, onClose, onSubmit, loading }: Props) {
  const [form] = Form.useForm();
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [templateData, setTemplateData] = useState<Record<string, any>>({});

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
    
    // Initialize template data with default values
    if (template) {
      const initialData: Record<string, any> = {};
      template.variablesSchema?.variables?.forEach(variable => {
        if (variable.defaultValue !== undefined) {
          initialData[variable.name] = variable.defaultValue;
        }
      });
      setTemplateData(initialData);
    }
  };

  const handleDataChange = (field: string, value: any) => {
    setTemplateData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!selectedTemplate) return;
    
    onSubmit({
      templateId: selectedTemplate.id,
      data: templateData,
      format: form.getFieldValue('format') || 'pdf',
    });
  };

  const renderVariableInput = (variable: any) => {
    const value = templateData[variable.name];

    switch (variable.type) {
      case 'string':
        return (
          <Input
            placeholder={variable.name}
            value={value || ''}
            onChange={(e) => handleDataChange(variable.name, e.target.value)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            placeholder={variable.name}
            value={value || ''}
            onChange={(e) => handleDataChange(variable.name, Number(e.target.value))}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            placeholder={variable.name}
            value={value || ''}
            onChange={(e) => handleDataChange(variable.name, e.target.value)}
          />
        );
      case 'boolean':
        return (
          <Select
            placeholder={variable.name}
            value={value !== undefined ? String(value) : undefined}
            onChange={(val) => handleDataChange(variable.name, val === 'true')}
          >
            <Select.Option value="true">True</Select.Option>
            <Select.Option value="false">False</Select.Option>
          </Select>
        );
      default:
        return (
          <Input
            placeholder={variable.name}
            value={value || ''}
            onChange={(e) => handleDataChange(variable.name, e.target.value)}
          />
        );
    }
  };

  return (
    <Modal
      title="Generate Document"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={800}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="templateId"
          label="Select Template"
          rules={[{ required: true, message: 'Please select a template' }]}
        >
          <Select 
            placeholder="Choose a template"
            onChange={handleTemplateChange}
            showSearch
            optionFilterProp="children"
          >
            {templates.map(template => (
              <Select.Option key={template.id} value={template.id}>
                {template.name} ({template.category})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {selectedTemplate && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`Template: ${selectedTemplate.name}`}
              description={selectedTemplate.category}
            />

            <Form.Item
              name="format"
              label="Output Format"
              initialValue="pdf"
            >
              <Select>
                {selectedTemplate.outputFormats.map(format => (
                  <Select.Option key={format} value={format}>
                    {format.toUpperCase()}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Divider>Template Data</Divider>

            <Card title="Required Information" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {selectedTemplate.variablesSchema?.variables?.map(variable => (
                  <div key={variable.name}>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>
                      {variable.name}
                      {variable.required && <span style={{ color: 'red' }}> *</span>}
                    </Text>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                      {variable.type}
                    </Text>
                    {renderVariableInput(variable)}
                  </div>
                ))}
              </Space>
            </Card>
          </>
        )}
      </Form>
    </Modal>
  );
}
