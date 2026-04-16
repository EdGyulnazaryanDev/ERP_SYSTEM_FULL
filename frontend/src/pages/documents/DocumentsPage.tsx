import { useState } from 'react';
import {
  Button, Table, Space, Tag, Popconfirm, Tabs, Typography, message,
  Card, Row, Col, Input, Select, Tooltip, Badge, Empty, Segmented,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  FileTextOutlined, DownloadOutlined, AppstoreOutlined,
  UnorderedListOutlined, SearchOutlined, FileProtectOutlined,
  FileDoneOutlined, FileExcelOutlined, FilePdfOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  documentsApi, type DocumentTemplate, type GeneratedDocument,
  type CreateTemplatePayload, type GenerateDocumentPayload,
} from '@/api/documents';
import TemplateFormModal from './TemplateFormModal';
import GenerateDocumentModal from './GenerateDocumentModal';
import TemplatePreviewModal from './TemplatePreviewModal';

const { Title, Text } = Typography;
const { Search } = Input;

const CATEGORY_COLORS: Record<string, string> = {
  employment: 'blue', payroll: 'green', financial: 'gold',
  shipping: 'cyan', legal: 'purple', default: 'default',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  employment: <FileProtectOutlined />, payroll: <FileDoneOutlined />,
  financial: <FilePdfOutlined />, shipping: <FileExcelOutlined />,
  legal: <FileProtectOutlined />, default: <FileTextOutlined />,
};

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['document-templates'],
    queryFn: async () => {
      const res = await documentsApi.getTemplates();
      return (res.data as any)?.data ?? res.data ?? [];
    },
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['generated-documents'],
    queryFn: async () => {
      const res = await documentsApi.getDocuments();
      return (res.data as any)?.data ?? res.data ?? [];
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: documentsApi.createTemplate,
    onSuccess: () => { message.success('Template created'); setTemplateModalOpen(false); queryClient.invalidateQueries({ queryKey: ['document-templates'] }); },
    onError: () => message.error('Failed to create template'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: documentsApi.deleteTemplate,
    onSuccess: () => { message.success('Template deleted'); queryClient.invalidateQueries({ queryKey: ['document-templates'] }); },
    onError: () => message.error('Failed to delete template'),
  });

  const generateDocumentMutation = useMutation({
    mutationFn: documentsApi.generateDocument,
    onSuccess: () => { message.success('Document generated'); setGenerateModalOpen(false); queryClient.invalidateQueries({ queryKey: ['generated-documents'] }); },
    onError: () => message.error('Failed to generate document'),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: documentsApi.deleteDocument,
    onSuccess: () => { message.success('Document deleted'); queryClient.invalidateQueries({ queryKey: ['generated-documents'] }); },
    onError: () => message.error('Failed to delete document'),
  });

  const handleDownload = async (doc: GeneratedDocument) => {
    try {
      const response = await documentsApi.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url; link.download = `${doc.title}.${doc.format}`;
      window.document.body.appendChild(link); link.click();
      window.document.body.removeChild(link); window.URL.revokeObjectURL(url);
    } catch { message.error('Failed to download'); }
  };

  const categories = ['all', ...Array.from(new Set((templates as DocumentTemplate[]).map(t => t.category)))];

  const filteredTemplates = (templates as DocumentTemplate[]).filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const TemplateCard = ({ template }: { template: DocumentTemplate }) => (
    <Card
      hoverable
      style={{ borderRadius: 12, height: '100%', border: '1px solid #f0f0f0' }}
      styles={{ body: { padding: 20 } }}
      onClick={() => { setSelectedTemplate(template); setPreviewOpen(true); }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20,
          background: `linear-gradient(135deg, var(--ant-color-primary-bg), var(--ant-color-primary-bg-hover))`,
          color: 'var(--ant-color-primary)',
        }}>
          {CATEGORY_ICONS[template.category] ?? CATEGORY_ICONS.default}
        </div>
        <Badge status={template.isActive ? 'success' : 'error'} text={template.isActive ? 'Active' : 'Inactive'} />
      </div>

      <Title level={5} style={{ margin: '0 0 4px', fontSize: 14 }} ellipsis={{ tooltip: template.name }}>
        {template.name}
      </Title>
      <Tag color={CATEGORY_COLORS[template.category] ?? 'default'} style={{ marginBottom: 12, textTransform: 'capitalize' }}>
        {template.category}
      </Tag>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        <Tag color="green" style={{ fontSize: 11 }}>{template.templateType.toUpperCase()}</Tag>
        {template.outputFormats.map(f => (
          <Tag key={f} color="orange" style={{ fontSize: 11 }}>{f.toUpperCase()}</Tag>
        ))}
      </div>

      <Text type="secondary" style={{ fontSize: 12 }}>
        {template.variablesSchema?.variables?.length ?? 0} variables
      </Text>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f5f5f5', display: 'flex', justifyContent: 'flex-end', gap: 4 }}
        onClick={e => e.stopPropagation()}>
        <Tooltip title="Preview">
          <Button size="small" type="text" icon={<EyeOutlined />}
            onClick={() => { setSelectedTemplate(template); setPreviewOpen(true); }} />
        </Tooltip>
        <Tooltip title="Edit">
          <Button size="small" type="text" icon={<EditOutlined />}
            onClick={() => { setSelectedTemplate(template); setTemplateModalOpen(true); }} />
        </Tooltip>
        <Tooltip title="Generate Document">
          <Button size="small" type="text" icon={<FileTextOutlined />}
            onClick={() => { setSelectedTemplate(template); setGenerateModalOpen(true); }} />
        </Tooltip>
        <Popconfirm title="Delete this template?" onConfirm={() => deleteTemplateMutation.mutate(template.id)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>
    </Card>
  );

  const templateColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (n: string) => <Text strong>{n}</Text> },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (c: string) => <Tag color={CATEGORY_COLORS[c] ?? 'default'} style={{ textTransform: 'capitalize' }}>{c}</Tag> },
    { title: 'Type', dataIndex: 'templateType', key: 'type', render: (t: string) => <Tag color="green">{t.toUpperCase()}</Tag> },
    { title: 'Formats', dataIndex: 'outputFormats', key: 'formats', render: (f: string[]) => <Space size={4}>{f.map(x => <Tag key={x} color="orange">{x.toUpperCase()}</Tag>)}</Space> },
    { title: 'Variables', key: 'vars', render: (_: any, r: DocumentTemplate) => <Text type="secondary">{r.variablesSchema?.variables?.length ?? 0}</Text> },
    { title: 'Status', dataIndex: 'isActive', key: 'status', render: (a: boolean) => <Badge status={a ? 'success' : 'error'} text={a ? 'Active' : 'Inactive'} /> },
    {
      title: 'Actions', key: 'actions', render: (_: any, r: DocumentTemplate) => (
        <Space>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedTemplate(r); setPreviewOpen(true); }} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setSelectedTemplate(r); setTemplateModalOpen(true); }} />
          <Button type="text" size="small" icon={<FileTextOutlined />} onClick={() => { setSelectedTemplate(r); setGenerateModalOpen(true); }} />
          <Popconfirm title="Delete?" onConfirm={() => deleteTemplateMutation.mutate(r.id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const documentColumns = [
    { title: 'Title', dataIndex: 'title', key: 'title', render: (t: string) => <Text strong>{t}</Text> },
    { title: 'Template', dataIndex: ['template', 'name'], key: 'template', render: (n: string) => <Text type="secondary">{n}</Text> },
    { title: 'Format', dataIndex: 'format', key: 'format', render: (f: string) => <Tag color="blue">{f.toUpperCase()}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Badge status={s === 'generated' ? 'success' : s === 'failed' ? 'error' : 'processing'} text={s} /> },
    { title: 'Size', dataIndex: 'fileSize', key: 'size', render: (s: number | null) => s ? `${(s / 1024).toFixed(1)} KB` : '—' },
    { title: 'Created', dataIndex: 'createdAt', key: 'date', render: (d: string) => new Date(d).toLocaleDateString() },
    {
      title: 'Actions', key: 'actions', render: (_: any, r: GeneratedDocument) => (
        <Space>
          {r.status === 'generated' && r.filePath && (
            <Button type="text" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(r)} />
          )}
          <Popconfirm title="Delete?" onConfirm={() => deleteDocumentMutation.mutate(r.id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'templates',
          label: 'Templates',
          children: (
            <div>
              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Search placeholder="Search templates..." prefix={<SearchOutlined />} style={{ width: 240 }}
                    value={search} onChange={e => setSearch(e.target.value)} allowClear />
                  <Select value={categoryFilter} onChange={setCategoryFilter} style={{ width: 160 }}
                    options={categories.map(c => ({ value: c, label: c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1) }))} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Segmented
                    value={viewMode}
                    onChange={v => setViewMode(v as 'grid' | 'list')}
                    options={[
                      { value: 'grid', icon: <AppstoreOutlined /> },
                      { value: 'list', icon: <UnorderedListOutlined /> },
                    ]}
                  />
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedTemplate(null); setTemplateModalOpen(true); }}>
                    New Template
                  </Button>
                </div>
              </div>

              {/* Grid View */}
              {viewMode === 'grid' ? (
                filteredTemplates.length === 0 ? (
                  <Empty description="No templates found" />
                ) : (
                  <Row gutter={[16, 16]}>
                    {filteredTemplates.map(t => (
                      <Col key={t.id} xs={24} sm={12} md={8} lg={6}>
                        <TemplateCard template={t} />
                      </Col>
                    ))}
                  </Row>
                )
              ) : (
                <Table dataSource={filteredTemplates} columns={templateColumns} rowKey="id"
                  loading={templatesLoading} pagination={{ pageSize: 10 }} />
              )}
            </div>
          ),
        },
        {
          key: 'documents',
          label: 'Generated Documents',
          children: (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>Generated Documents</Title>
                <Button type="primary" icon={<FileTextOutlined />} onClick={() => setGenerateModalOpen(true)}>
                  Generate Document
                </Button>
              </div>
              <Table dataSource={documents} columns={documentColumns} rowKey="id"
                loading={documentsLoading} pagination={{ pageSize: 10 }} />
            </div>
          ),
        },
      ]} />

      <TemplateFormModal
        open={templateModalOpen}
        template={selectedTemplate}
        onClose={() => { setTemplateModalOpen(false); setSelectedTemplate(null); }}
        onSubmit={(data: CreateTemplatePayload) => { if (!selectedTemplate) createTemplateMutation.mutate(data); }}
        loading={createTemplateMutation.isPending}
      />

      <GenerateDocumentModal
        open={generateModalOpen}
        templates={templates}
        onClose={() => setGenerateModalOpen(false)}
        onSubmit={(data: GenerateDocumentPayload) => generateDocumentMutation.mutate(data)}
        loading={generateDocumentMutation.isPending}
      />

      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          open={previewOpen}
          onClose={() => { setPreviewOpen(false); setSelectedTemplate(null); }}
        />
      )}
    </div>
  );
}
