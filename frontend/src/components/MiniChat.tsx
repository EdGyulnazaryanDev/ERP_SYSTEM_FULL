import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input, Avatar, Typography, Empty, Spin, Tag, Badge, Tooltip, Popover } from 'antd';
import { MessageOutlined, SendOutlined, CloseOutlined, EditOutlined, DeleteOutlined, SmileOutlined } from '@ant-design/icons';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

const { Text } = Typography;

const WS_URL = import.meta.env.DEV ? 'http://localhost:3100' : (import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3100');
const EMOJIS = ['👍','❤️','😂','😮','😢','🔥','✅','👏'];

interface Msg {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  reply_to_id?: string;
  reply_to_preview?: string;
  is_edited: boolean;
  is_deleted: boolean;
  reactions: Record<string, string[]>;
  created_at: string;
}

interface Presence { user_id: string; user_name: string; is_typing: boolean; }

let socketInstance: Socket | null = null;

function getSocket(token: string): Socket {
  if (!socketInstance || !socketInstance.connected) {
    socketInstance = io(`${WS_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });
  }
  return socketInstance;
}

export default function MiniChat() {
  const { user, token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [presence, setPresence] = useState<Presence[]>([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect socket
  useEffect(() => {
    if (!token) return;
    const sock = getSocket(token);
    socketRef.current = sock;

    sock.on('connect', () => { setConnected(true); setLoading(false); });
    sock.on('disconnect', () => setConnected(false));
    sock.on('history', (msgs: Msg[]) => { setMessages(msgs); setLoading(false); });
    sock.on('new_message', (msg: Msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!open) setUnread((n) => n + 1);
    });
    sock.on('message_updated', (msg: Msg) => {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? msg : m));
    });
    sock.on('presence', (p: Presence[]) => setPresence(p));
    sock.on('unread', (n: number) => setUnread(n));

    if (!sock.connected) { setLoading(true); sock.connect(); }

    return () => {
      sock.off('connect'); sock.off('disconnect'); sock.off('history');
      sock.off('new_message'); sock.off('message_updated');
      sock.off('presence'); sock.off('unread');
    };
  }, [token, open]);

  // Heartbeat every 20s
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => socketRef.current?.emit('heartbeat'), 20_000);
    return () => clearInterval(t);
  }, [connected]);

  // Scroll to bottom on every new message or when opened
  useEffect(() => {
    if (open) scrollToBottom('smooth');
  }, [messages, open, scrollToBottom]);

  // Mark read when opened
  useEffect(() => {
    if (open) {
      setUnread(0);
      socketRef.current?.emit('mark_read');
    }
  }, [open]);

  const handleSend = useCallback(() => {
    const t = text.trim();
    if (!t || !connected) return;
    socketRef.current?.emit('send_message', { content: t, reply_to_id: replyTo?.id });
    setText('');
    setReplyTo(null);
  }, [text, connected, replyTo]);

  const handleEdit = useCallback(() => {
    if (!editText.trim() || !editingId) return;
    socketRef.current?.emit('edit_message', { id: editingId, content: editText.trim() });
    setEditingId(null);
    setEditText('');
  }, [editText, editingId]);

  const handleDelete = (id: string) => socketRef.current?.emit('delete_message', { id });
  const handleReact = (id: string, emoji: string) => socketRef.current?.emit('react', { id, emoji });

  const handleTyping = (val: string) => {
    setText(val);
    socketRef.current?.emit('typing', { is_typing: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketRef.current?.emit('typing', { is_typing: false }), 2000);
  };

  const typingUsers = presence.filter((p) => p.is_typing && p.user_id !== user?.id);
  const onlineCount = presence.filter((p) => p.user_id !== user?.id).length;

  if (!open) {
    return (
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        <Badge count={unread} overflowCount={99}>
          <Button type="primary" shape="circle" size="large"
            icon={<MessageOutlined style={{ fontSize: 20 }} />}
            onClick={() => setOpen(true)}
            style={{ width: 56, height: 56, boxShadow: '0 8px 24px rgba(22,119,255,0.4)' }}
          />
        </Badge>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, width: 380, display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(2,10,19,0.7)', border: '1px solid rgba(134,166,197,0.2)', background: 'rgba(8,25,40,0.98)', backdropFilter: 'blur(20px)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(134,166,197,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageOutlined style={{ color: '#1677ff' }} />
          <Text style={{ color: '#f0f6ff', fontWeight: 600 }}>Team Chat</Text>
          <Tag color={connected ? 'green' : 'red'} style={{ fontSize: 10, margin: 0 }}>
            {connected ? `${onlineCount + 1} online` : 'offline'}
          </Tag>
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setOpen(false)} />
      </div>

      {/* Online avatars */}
      {presence.length > 0 && (
        <div style={{ padding: '6px 16px', borderBottom: '1px solid rgba(134,166,197,0.08)', display: 'flex', gap: 4, alignItems: 'center' }}>
          {presence.slice(0, 6).map((p) => (
            <Tooltip key={p.user_id} title={p.user_name}>
              <Avatar size={22} style={{ background: '#1677ff', fontSize: 10, cursor: 'default' }}>
                {p.user_name[0]?.toUpperCase()}
              </Avatar>
            </Tooltip>
          ))}
          {presence.length > 6 && <Text style={{ color: '#8a9bb0', fontSize: 11 }}>+{presence.length - 6}</Text>}
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} style={{ height: 380, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>}
        {!loading && messages.length === 0 && <Empty description={<Text style={{ color: '#8a9bb0', fontSize: 12 }}>No messages yet</Text>} />}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          return (
            <div key={msg.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row' }}>
              <Avatar size={26} style={{ background: isMe ? '#1677ff' : '#722ed1', flexShrink: 0, fontSize: 11 }}>
                {msg.user_name[0]?.toUpperCase()}
              </Avatar>
              <div style={{ maxWidth: '75%' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <Text style={{ color: '#c8dff0', fontSize: 11, fontWeight: 600 }}>{isMe ? 'You' : msg.user_name}</Text>
                  <Text style={{ color: '#4a6070', fontSize: 10 }}>
                    {new Date(msg.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {msg.is_edited && <Text style={{ color: '#4a6070', fontSize: 10 }}>(edited)</Text>}
                </div>

                {/* Reply preview */}
                {msg.reply_to_preview && (
                  <div style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', borderLeft: '2px solid #1677ff', marginBottom: 4 }}>
                    <Text style={{ color: '#8a9bb0', fontSize: 11 }}>{msg.reply_to_preview}</Text>
                  </div>
                )}

                {/* Bubble */}
                <div style={{ position: 'relative' }}>
                  <div style={{ padding: '8px 12px', borderRadius: 12, background: msg.is_deleted ? 'transparent' : isMe ? 'rgba(22,119,255,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${msg.is_deleted ? 'transparent' : isMe ? 'rgba(22,119,255,0.3)' : 'rgba(134,166,197,0.1)'}` }}>
                    <Text style={{ color: msg.is_deleted ? '#4a6070' : '#f0f6ff', fontSize: 13, wordBreak: 'break-word', fontStyle: msg.is_deleted ? 'italic' : 'normal' }}>
                      {msg.content}
                    </Text>
                  </div>

                  {/* Reactions */}
                  {Object.keys(msg.reactions).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                      {Object.entries(msg.reactions).map(([emoji, users]) => (
                        <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                          style={{ background: users.includes(user?.id ?? '') ? 'rgba(22,119,255,0.2)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(134,166,197,0.15)', borderRadius: 10, padding: '1px 6px', cursor: 'pointer', fontSize: 12, color: '#f0f6ff' }}>
                          {emoji} {users.length}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Actions on hover */}
                  {!msg.is_deleted && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <Popover trigger="click" content={
                        <div style={{ display: 'flex', gap: 6 }}>
                          {EMOJIS.map((e) => (
                            <button key={e} onClick={() => handleReact(msg.id, e)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 2 }}>{e}</button>
                          ))}
                        </div>
                      }>
                        <Button type="text" size="small" icon={<SmileOutlined />} style={{ color: '#8a9bb0', padding: '0 4px', height: 20, fontSize: 11 }} />
                      </Popover>
                      <Button type="text" size="small" icon={<EditOutlined style={{ fontSize: 10 }} />}
                        style={{ color: '#8a9bb0', padding: '0 4px', height: 20 }}
                        onClick={() => { setReplyTo(msg); setText(''); }} title="Reply" />
                      {isMe && (
                        <>
                          <Button type="text" size="small" icon={<EditOutlined style={{ fontSize: 10 }} />}
                            style={{ color: '#8a9bb0', padding: '0 4px', height: 20 }}
                            onClick={() => { setEditingId(msg.id); setEditText(msg.content); }} title="Edit" />
                          <Button type="text" size="small" icon={<DeleteOutlined style={{ fontSize: 10 }} />}
                            style={{ color: '#ff4d4f', padding: '0 4px', height: 20 }}
                            onClick={() => handleDelete(msg.id)} title="Delete" />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div style={{ padding: '4px 16px' }}>
          <Text style={{ color: '#8a9bb0', fontSize: 11, fontStyle: 'italic' }}>
            {typingUsers.map((p) => p.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </Text>
        </div>
      )}

      {/* Reply banner */}
      {replyTo && (
        <div style={{ padding: '6px 16px', background: 'rgba(22,119,255,0.08)', borderTop: '1px solid rgba(22,119,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#7dd3fc', fontSize: 12 }}>↩ Replying to: {replyTo.content.slice(0, 40)}</Text>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setReplyTo(null)} />
        </div>
      )}

      {/* Edit mode */}
      {editingId && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(134,166,197,0.1)', display: 'flex', gap: 8 }}>
          <Input value={editText} onChange={(e) => setEditText(e.target.value)}
            onPressEnter={handleEdit}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(22,119,255,0.3)', borderRadius: 8, color: '#f0f6ff' }} />
          <Button type="primary" size="small" onClick={handleEdit}>Save</Button>
          <Button size="small" onClick={() => { setEditingId(null); setEditText(''); }}>Cancel</Button>
        </div>
      )}

      {/* Input */}
      {!editingId && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(134,166,197,0.1)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Input.TextArea
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={connected ? 'Message... (Enter to send)' : 'Connecting...'}
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={!connected}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(134,166,197,0.15)', borderRadius: 10, color: '#f0f6ff', resize: 'none' }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend}
            disabled={!text.trim() || !connected}
            style={{ borderRadius: 10, minWidth: 40, height: 36 }} />
        </div>
      )}
    </div>
  );
}
