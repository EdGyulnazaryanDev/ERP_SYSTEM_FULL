import { Modal, Tag, Typography, Badge, Tooltip, theme, Tabs } from 'antd';
import {
  FileTextOutlined, CodeOutlined, CheckCircleOutlined, CloseCircleOutlined,
  EyeOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { type DocumentTemplate } from '@/api/documents';

const { Title, Text } = Typography;
const { useToken } = theme;

const CATEGORY_COLORS: Record<string, string> = {
  employment: '#3b82f6', payroll: '#10b981', financial: '#f59e0b',
  shipping: '#06b6d4', legal: '#8b5cf6', default: '#6b7280',
};

interface Props {
  template: DocumentTemplate;
  open: boolean;
  onClose: () => void;
}

export default function TemplatePreviewModal({ template, open, onClose }: Props) {
  const { token } = useToken();
  const accent = CATEGORY_COLORS[template.category] ?? CATEGORY_COLORS.default;

  const variables = template.variablesSchema?.variables ?? [];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={820}
      style={{ top: 40 }}
      styles={{
        content: { padding: 0, borderRadius: 18, overflow: 'hidden', background: token.colorBgElevated, border: `1px solid ${token.colorBorderSecondary}` },
        mask: { backdropFilter: 'blur(4px)' },
      }}
    >
      {/* Header banner */}
      <div style={{
        background: `linear-gradient(135deg, ${accent}22 0%, ${token.colorBgElevated} 100%)`,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        padding: '28px 32px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: `${accent}20`, border: `1.5px solid ${accent}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, color: accent,
          }}>
            <FileTextOutlined />
          </div>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: '0 0 8px', color: token.colorTextHeading, fontSize: 20 }}>
              {template.name}
            </Title>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <Tag style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30`, borderRadius: 8, textTransform: 'capitalize', fontWeight: 600 }}>
                {template.category}
              </Tag>
              <Tag style={{ background: `${token.colorSuccess}18`, color: token.colorSuccess, border: `1px solid ${token.colorSuccess}30`, borderRadius: 8 }}>
                {template.templateType.toUpperCase()}
              </Tag>
              {template.outputFormats.map(f => (
                <Tag key={f} style={{ background: `${token.colorWarning}18`, color: token.colorWarning, border: `1px solid ${token.colorWarning}30`, borderRadius: 8 }}>
                  {f.toUpperCase()}
                </Tag>
              ))}
              <Badge
                status={template.isActive ? 'success' : 'error'}
                text={<Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>{template.isActive ? 'Active' : 'Inactive'}</Text>}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <Tabs
        defaultActiveKey="variables"
        style={{ padding: '0 32px' }}
        items={[
          {
            key: 'variables',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <InfoCircleOutlined /> Variables
                <Tag style={{ marginLeft: 2, fontSize: 11, padding: '0 6px' }}>{variables.length}</Tag>
              </span>
            ),
            children: (
              <div style={{ paddingBottom: 28 }}>
                {variables.length === 0 ? (
                  <Text type="secondary">No variables defined</Text>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {variables.map(v => (
                      <div key={v.name} style={{
                        padding: '12px 16px', borderRadius: 12,
                        background: token.colorFillQuaternary,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text code style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
                            {`{{${v.name}}}`}
                          </Text>
                          <Text style={{ fontSize: 11, color: token.colorTextTertiary }}>{v.type}</Text>
                        </div>
                        <Tooltip title={v.required ? 'Required' : 'Optional'}>
                          {v.required
                            ? <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 15 }} />
                            : <CloseCircleOutlined style={{ color: token.colorTextQuaternary, fontSize: 15 }} />}
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'preview',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <EyeOutlined /> HTML Preview
              </span>
            ),
            children: (
              <div style={{ paddingBottom: 28 }}>
                <div style={{
                  borderRadius: 12, overflow: 'hidden',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}>
                  <iframe
                    srcDoc={template.templateContent}
                    style={{ width: '100%', height: 380, border: 'none', background: '#fff' }}
                    sandbox="allow-same-origin"
                    title="Template Preview"
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'source',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CodeOutlined /> Source
              </span>
            ),
            children: (
              <div style={{ paddingBottom: 28 }}>
                <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${token.colorBorderSecondary}` }}>
                  <div style={{ background: '#1a1a2e', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                      <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                    ))}
                    <Text style={{ color: '#6b7280', fontSize: 11, marginLeft: 8 }}>{template.templateType}</Text>
                  </div>
                  <div style={{ background: '#0d1117', padding: '16px 20px', maxHeight: 340, overflow: 'auto' }}>
                    <pre style={{ margin: 0, color: '#e6edf3', fontSize: 12, fontFamily: '"Fira Code", "JetBrains Mono", monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7 }}>
                      {template.templateContent}
                    </pre>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}
