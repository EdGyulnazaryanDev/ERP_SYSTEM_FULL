import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Tag, Tooltip, Button, Badge, Modal, Form, Input, Select, message, Spin, Space } from 'antd';
import { PlusOutlined, LinkOutlined } from '@ant-design/icons';
import apiClient from '@/api/client';
// import { useAuthStore } from '@/store/authStore';

const COLUMNS = [
  { key: 'new',         label: 'New',         color: '#6366f1' },
  { key: 'open',        label: 'Open',         color: '#0ea5e9' },
  { key: 'in_progress', label: 'In Progress',  color: '#f59e0b' },
  { key: 'pending',     label: 'Pending',      color: '#8b5cf6' },
  { key: 'resolved',    label: 'Resolved',     color: '#22c55e' },
  { key: 'closed',      label: 'Closed',       color: '#6b7280' },
];

const PRIORITY_COLOR: Record<string, string> = {
  low: 'green', medium: 'blue', high: 'orange', urgent: 'red', critical: 'magenta',
};

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  customer_name?: string;
  assigned_to?: string;
  due_date?: string;
  trello_card_url?: string;
  tags?: string[];
}

export default function TicketKanbanTab() {
  const queryClient = useQueryClient();
  const [listSelectorOpen, setListSelectorOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [createModal, setCreateModal] = useState(false);
  const [form] = Form.useForm();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ['tickets-kanban'],
    queryFn: async () => {
      console.log('🔍 Kanban: Fetching tickets...');
      const res = await apiClient.get('/service-management/tickets');
      const d = res.data;
      console.log('🔍 Kanban: API response:', d);
      const tickets = d.data || [];
      console.log('🔍 Kanban: Tickets parsed:', tickets);
      
      return tickets;
    },
  });

  const { data: trelloLists = [] } = useQuery({
    queryKey: ['trello-lists'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/service-management/integrations/trello/lists');
        return res.data;
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/service-management/tickets/${id}/move`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets-kanban'] }),
    onError: () => message.error('Failed to move ticket'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/service-management/tickets', data),
    onSuccess: () => {
      message.success('Ticket created');
      setCreateModal(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['tickets-kanban'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create ticket'),
  });

  const pushTrelloMutation = useMutation({
    mutationFn: ({ ticketId, listId }: { ticketId: string; listId: string }) => 
      apiClient.post(`/service-management/tickets/${ticketId}/push-trello`, { listId }),
    onSuccess: (res) => {
      if (res.data?.url) {
        message.success('Pushed to Trello');
        queryClient.invalidateQueries({ queryKey: ['tickets-kanban'] });
      } else {
        message.warning(res.data?.message || 'Trello not configured');
      }
    },
  });

  const byStatus = useMemo(() => {
    const map: Record<string, Ticket[]> = {};
    COLUMNS.forEach(c => { map[c.key] = []; });
    tickets.forEach(t => {
      if (map[t.status]) map[t.status].push(t);
      else map['new'].push(t);
    });
    return map;
  }, [tickets]);

  const handleDrop = (targetStatus: string) => {
    if (dragging && dragging !== targetStatus) {
      const ticket = tickets.find(t => t.id === dragging);
      if (ticket && ticket.status !== targetStatus) {
        moveMutation.mutate({ id: dragging, status: targetStatus });
      }
    }
    setDragging(null);
    setDragOver(null);
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: 'var(--app-text-muted)', fontSize: 13 }}>
          {tickets.length} tickets across {COLUMNS.length} columns
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
          New Ticket
        </Button>
      </div>

      {/* Kanban board */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
        {COLUMNS.map(col => (
          <div
            key={col.key}
            style={{ minWidth: 240, flex: '0 0 240px' }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
            onDrop={() => handleDrop(col.key)}
            onDragLeave={() => setDragOver(null)}
          >
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
              padding: '6px 10px', borderRadius: 8,
              background: dragOver === col.key ? `${col.color}22` : 'transparent',
              border: dragOver === col.key ? `1px dashed ${col.color}` : '1px solid transparent',
              transition: 'all 0.15s',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--app-text)' }}>{col.label}</span>
              <Badge count={byStatus[col.key].length} style={{ background: col.color }} />
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
              {byStatus[col.key].map(ticket => (
                <div
                  key={ticket.id}
                  draggable
                  onDragStart={() => setDragging(ticket.id)}
                  onDragEnd={() => { setDragging(null); setDragOver(null); }}
                  style={{ opacity: dragging === ticket.id ? 0.5 : 1, cursor: 'grab' }}
                >
                  <Card
                    size="small"
                    style={{
                      borderRadius: 10,
                      border: `1px solid rgba(134,166,197,0.15)`,
                      background: 'rgba(8,25,40,0.7)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                    styles={{ body: { padding: '10px 12px' } }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--app-text-muted)', fontFamily: 'monospace' }}>
                        {ticket.ticket_number}
                      </span>
                      <Tag color={PRIORITY_COLOR[ticket.priority]} style={{ fontSize: 10, margin: 0 }}>
                        {ticket.priority}
                      </Tag>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--app-text)', marginBottom: 8, lineHeight: 1.4 }}>
                      {ticket.subject}
                    </div>

                    {ticket.customer_name && (
                      <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginBottom: 6 }}>
                        👤 {ticket.customer_name}
                      </div>
                    )}

                    {ticket.due_date && (
                      <div style={{ fontSize: 11, color: new Date(ticket.due_date) < new Date() ? '#ef4444' : 'var(--app-text-muted)', marginBottom: 6 }}>
                        📅 {new Date(ticket.due_date).toLocaleDateString()}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {ticket.tags?.slice(0, 2).map(tag => (
                          <Tag key={tag} style={{ fontSize: 10, margin: 0 }}>{tag}</Tag>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {ticket.trello_card_url ? (
                          <Tooltip title="View on Trello">
                            <a href={ticket.trello_card_url} target="_blank" rel="noreferrer">
                              <Button type="text" size="small" icon={<LinkOutlined />} style={{ color: '#0052cc', padding: '0 4px', height: 20 }} />
                            </a>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Push to Trello">
                            <Button
                              type="text" size="small" icon={<LinkOutlined />}
                              style={{ color: 'var(--app-text-muted)', padding: '0 4px', height: 20 }}
                              onClick={() => {
                                setSelectedTicketId(ticket.id);
                                setListSelectorOpen(true);
                              }}
                            />
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              ))}

              {byStatus[col.key].length === 0 && (
                <div style={{
                  border: '1px dashed rgba(134,166,197,0.15)', borderRadius: 10,
                  padding: '20px 12px', textAlign: 'center',
                  color: 'var(--app-text-muted)', fontSize: 12,
                }}>
                  Drop here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create ticket modal */}
      <Modal
        title="New Ticket"
        open={createModal}
        onCancel={() => { setCreateModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create"
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="Brief description of the issue" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="customer_name" label="Customer Name">
            <Input />
          </Form.Item>
          <Form.Item name="customer_email" label="Customer Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="priority" label="Priority" initialValue="medium">
            <Select options={[
              { value: 'low', label: '🟢 Low' },
              { value: 'medium', label: '🟡 Medium' },
              { value: 'high', label: '🟠 High' },
              { value: 'urgent', label: '🔴 Urgent' },
              { value: 'critical', label: '🚨 Critical' },
            ]} />
          </Form.Item>
          <Form.Item name="channel" label="Channel" initialValue="web">
            <Select options={[
              { value: 'web', label: 'Web' },
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
              { value: 'chat', label: 'Chat' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Trello List Selector Modal */}
      <Modal
        title="Select Trello List"
        open={listSelectorOpen}
        onCancel={() => {
          setListSelectorOpen(false);
          setSelectedTicketId(null);
          setSelectedListId('');
        }}
        onOk={() => {
          if (selectedTicketId && selectedListId) {
            pushTrelloMutation.mutate({ ticketId: selectedTicketId, listId: selectedListId });
            setListSelectorOpen(false);
            setSelectedTicketId(null);
            setSelectedListId('');
          }
        }}
        okText="Push to Trello"
        cancelText="Cancel"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>Select which Trello list to push this ticket to:</div>
          <Select
            placeholder="Choose a list"
            style={{ width: '100%' }}
            value={selectedListId}
            onChange={setSelectedListId}
            options={trelloLists.map((list: any) => ({
              label: list.name,
              value: list.id,
            }))}
          />
        </Space>
      </Modal>
    </div>
  );
}
