import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Button, Collapse, Badge, message, Tooltip, Progress } from 'antd';
import { PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import apiClient from '@/api/client';

interface RoadmapItem {
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
}

interface RoadmapCategory {
  label: string;
  color: string;
  items: RoadmapItem[];
}

const ROADMAP: RoadmapCategory[] = [
  {
    label: 'Sales & Customer',
    color: '#0ea5e9',
    items: [
      { subject: 'Subscriptions Module — Recurring billing, MRR/ARR tracking, churn alerts', description: 'Implement recurring subscription plans with MRR/ARR dashboards, auto-renewal billing, upgrade/downgrade flows, and customer retention tools.', priority: 'high', tags: ['sales', 'billing', 'subscriptions'] },
      { subject: 'Rental Module — Asset rental lifecycle management', description: 'Availability calendar, rental contracts, security deposits, product return tracking, and pricing by duration.', priority: 'medium', tags: ['sales', 'rental'] },
      { subject: 'Point of Sale (POS) — Retail & restaurant terminal', description: 'Offline-capable POS with multi-terminal support, restaurant floor plan, kitchen display, loyalty cards, split payments, barcode scanning, and end-of-day reports.', priority: 'high', tags: ['pos', 'retail', 'sales'] },
      { subject: 'Loyalty & Gifts — Points, coupons, gift cards', description: 'Point programs, gift cards, promo codes, coupon campaigns, tiered rewards, and cross-channel redemption.', priority: 'medium', tags: ['loyalty', 'marketing', 'sales'] },
    ],
  },
  {
    label: 'Finance',
    color: '#0f766e',
    items: [
      { subject: 'Expenses Module — Employee expense claims with receipt OCR', description: 'Mobile receipt scanning with AI OCR, expense categories, manager approval workflow, reimbursement via payroll, per diem rules, and expense analytics.', priority: 'high', tags: ['finance', 'hr', 'expenses'] },
      { subject: 'Document Management System (DMS) — PDF editor, e-sign workflows', description: 'Folder/workspace structure, PDF editor, merge/split PDFs, auto-tagging, activity-based workflows, linked to Sales/HR/Purchase.', priority: 'medium', tags: ['documents', 'finance'] },
      { subject: 'Electronic Signatures — Standalone e-signature module', description: 'Drag-drop signature fields, multi-party signing, SMS verification, signature audit trail, template reuse, auto-send on trigger.', priority: 'medium', tags: ['sign', 'legal', 'finance'] },
      { subject: 'Spreadsheets — Live data pivot and BI models', description: 'Live Odoo-style data pivot, charts & dashboards, formulas with live data, share with teams, forecasting models.', priority: 'low', tags: ['bi', 'finance', 'spreadsheets'] },
    ],
  },
  {
    label: 'Supply Chain',
    color: '#15803d',
    items: [
      { subject: 'Barcode / RFID — Mobile scanning, batch picking', description: 'Mobile scan app, batch picking, cluster picking, receive/deliver with scan, pack & unpack, inventory count by scan.', priority: 'high', tags: ['inventory', 'warehouse', 'barcode'] },
      { subject: 'Replenishment Rules Engine — Min/max, safety stock automation', description: 'Min/max rules, make-to-order, reorder point alerts, vendor lead time, safety stock, multi-location reorder.', priority: 'high', tags: ['inventory', 'procurement', 'replenishment'] },
      { subject: 'eCommerce — Online store, catalog, cart, checkout', description: 'Product catalog with variants, cart & checkout, promotions & vouchers, product comparison, customer reviews, B2B pricelist portal, wishlist, abandoned cart recovery.', priority: 'urgent', tags: ['ecommerce', 'sales', 'website'] },
    ],
  },
  {
    label: 'Manufacturing',
    color: '#dc2626',
    items: [
      { subject: 'PLM — Product Lifecycle Management, ECO, BOM versioning', description: 'Engineering change orders (ECO), BOM versioning, document-linked to components, approval flow for changes, change impact analysis.', priority: 'medium', tags: ['manufacturing', 'plm'] },
      { subject: 'Quality Control — QC checks, FMEA, non-conformance reports', description: 'QC control points, quality alerts, non-conformance reports, FMEA, statistical process control, blocked lot on failure, integration with MRP & Inventory.', priority: 'high', tags: ['manufacturing', 'quality'] },
      { subject: 'Master Scheduling (MPS) — Capacity planning, demand planning', description: 'Demand planning, supply forecasting, replenishment planning, manufacturing capacity view, safety stock by product.', priority: 'medium', tags: ['manufacturing', 'planning'] },
      { subject: 'Shop Floor UI — Tablet operator interface', description: 'Tablet-optimized UI for work center operations, timer tracking, quality check at step, scrap from workstation, instructions & attachments.', priority: 'low', tags: ['manufacturing', 'shop-floor'] },
    ],
  },
  {
    label: 'Human Resources',
    color: '#7c3aed',
    items: [
      { subject: 'Recruitment / ATS — Job boards, application pipeline', description: 'Job positions & ads, Kanban application pipeline, resume parsing, interview scheduling, offer letter generation, LinkedIn/Indeed integration, referral tracking.', priority: 'high', tags: ['hr', 'recruitment', 'ats'] },
      { subject: 'eLearning / LMS — Courses, certifications, quizzes', description: 'Course builder, video & PDF content, quizzes & certifications, gamification (badges, points), student progress tracking, channel subscriptions.', priority: 'medium', tags: ['hr', 'lms', 'elearning'] },
      { subject: 'Employee Referral Program', description: 'Employee referral links, point-based rewards, referral pipeline tracking, payout management.', priority: 'low', tags: ['hr', 'referral'] },
      { subject: 'Flexible Work Scheduling — Remote/hybrid scheduling', description: 'Work schedules, remote/hybrid flag, schedule exceptions, integration with attendance.', priority: 'medium', tags: ['hr', 'scheduling'] },
    ],
  },
  {
    label: 'Marketing & Communication',
    color: '#db2777',
    items: [
      { subject: 'Email Marketing — Campaigns, lists, A/B testing', description: 'Drag-drop email builder, A/B testing, mailing lists & segmentation, unsubscribe management, open/click tracking, scheduled sending, blacklist management.', priority: 'urgent', tags: ['marketing', 'email'] },
      { subject: 'SMS Marketing — Bulk SMS, automation', description: 'Bulk SMS campaigns, SMS automation, personalization tokens, delivery reports, opt-out handling.', priority: 'medium', tags: ['marketing', 'sms'] },
      { subject: 'Social Marketing — Schedule posts, multi-account', description: 'Schedule posts, multi-account management, Facebook/LinkedIn/Twitter/Instagram, engagement tracking, social feed monitor.', priority: 'medium', tags: ['marketing', 'social'] },
      { subject: 'Events Management — Registration, tickets, booths', description: 'Event website page, ticketing & registration, sponsor/exhibitor booths, lead capture, badge printing, online webinar support, revenue from tickets.', priority: 'medium', tags: ['marketing', 'events'] },
      { subject: 'Surveys & Forms — NPS, quizzes, conditional logic', description: 'Question types (MCQ, scale, matrix), conditional logic, timed quizzes, anonymous responses, NPS tracking, PDF export, integration with HR/CRM.', priority: 'high', tags: ['marketing', 'surveys'] },
      { subject: 'Live Chat Widget — Chatbot builder, multi-channel', description: 'Website chat widget, chatbot builder, multi-channel (WhatsApp, Telegram), chat to ticket escalation, visitor tracking, offline message capture.', priority: 'high', tags: ['communication', 'chat', 'support'] },
      { subject: 'Marketing Automation — Drip campaigns, triggers', description: 'Visual workflow builder, trigger-based sequences, lead scoring rules, email + SMS + tasks in one flow, A/B branch testing, CRM opportunity creation.', priority: 'urgent', tags: ['marketing', 'automation'] },
    ],
  },
  {
    label: 'Website & Digital',
    color: '#64748b',
    items: [
      { subject: 'Website Builder / CMS — Drag-drop, SEO, multi-language', description: 'Drag-drop page builder, SEO metadata, multi-language, responsive templates, cookie consent, Google Analytics integration, password-protected pages.', priority: 'urgent', tags: ['website', 'cms'] },
      { subject: 'Blog — Content management, SEO-friendly', description: 'Blog posts & categories, comment moderation, RSS feed, SEO-friendly URLs, author profiles.', priority: 'low', tags: ['website', 'blog'] },
      { subject: 'Community Forum — Q&A, voting, moderation', description: 'Q&A format, vote up/down, tags & categories, gamification badges, moderation tools.', priority: 'low', tags: ['website', 'community'] },
      { subject: 'Customer Self-Service Portal', description: 'View orders, invoices, tickets. Download documents, sign quotes online, track deliveries, submit helpdesk tickets, pay invoices online.', priority: 'urgent', tags: ['portal', 'customer', 'self-service'] },
    ],
  },
  {
    label: 'AI & Productivity',
    color: '#d97706',
    items: [
      { subject: 'AI Assistant — Chat, summarize, draft emails', description: 'Chat-based queries inside ERP, summarize records, draft emails from CRM, translate documents, meeting notes summary, action suggestions.', priority: 'high', tags: ['ai', 'productivity'] },
      { subject: 'AI Document Processing — OCR invoice reading', description: 'OCR invoice reading, auto-fill vendor bills, receipt digitization, smart field extraction, batch document processing.', priority: 'high', tags: ['ai', 'documents', 'ocr'] },
      { subject: 'Predictive Inventory AI — Demand forecasting', description: 'Demand forecasting by product, seasonal trend detection, suggested reorder quantities, stockout risk alerts, supplier lead time learning.', priority: 'medium', tags: ['ai', 'inventory', 'forecasting'] },
      { subject: 'VoIP Integration — Click-to-call from CRM/Helpdesk', description: 'Click-to-call from CRM/Helpdesk, call logging, auto-create lead on call, call recording, Twilio/Axivox integration, softphone widget in browser.', priority: 'medium', tags: ['voip', 'crm', 'communication'] },
      { subject: 'IoT Box — Hardware integrations', description: 'Connect printers, scales, scanners, POS hardware, manufacturing sensors, camera for quality checks, plug-and-play setup.', priority: 'low', tags: ['iot', 'hardware'] },
    ],
  },
];

const PRIORITY_COLOR: Record<string, string> = {
  low: 'green', medium: 'blue', high: 'orange', urgent: 'red',
};

export default function RoadmapTab() {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<Set<string>>(new Set());

  const createMutation = useMutation({
    mutationFn: (item: RoadmapItem) => apiClient.post('/service-management/tickets', {
      subject: item.subject,
      description: item.description,
      priority: item.priority,
      tags: item.tags,
      channel: 'web',
      status: 'new',
    }),
    onSuccess: (_, item) => {
      setCreated(prev => new Set([...prev, item.subject]));
      setCreating(prev => { const s = new Set(prev); s.delete(item.subject); return s; });
      queryClient.invalidateQueries({ queryKey: ['tickets-kanban'] });
    },
    onError: (_, item) => {
      setCreating(prev => { const s = new Set(prev); s.delete(item.subject); return s; });
      message.error('Failed to create ticket');
    },
  });

  const createAll = async (items: RoadmapItem[]) => {
    const pending = items.filter(i => !created.has(i.subject));
    setCreating(prev => new Set([...prev, ...pending.map(i => i.subject)]));
    for (const item of pending) {
      await createMutation.mutateAsync(item).catch(() => {});
    }
    message.success(`Created ${pending.length} tickets`);
  };

  const totalItems = ROADMAP.reduce((sum, cat) => sum + cat.items.length, 0);
  const totalCreated = created.size;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <span style={{ color: 'var(--app-text)', fontWeight: 600, fontSize: 15 }}>
              Unimplemented Odoo Modules
            </span>
            <span style={{ color: 'var(--app-text-muted)', fontSize: 13, marginLeft: 12 }}>
              {totalCreated} / {totalItems} tickets created
            </span>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => ROADMAP.forEach(cat => createAll(cat.items))}
          >
            Create All as Tickets
          </Button>
        </div>
        <Progress
          percent={Math.round((totalCreated / totalItems) * 100)}
          strokeColor="#0f766e"
          trailColor="rgba(134,166,197,0.15)"
          style={{ marginBottom: 0 }}
        />
      </div>

      <Collapse
        defaultActiveKey={ROADMAP.map(c => c.label)}
        style={{ background: 'transparent', border: 'none' }}
        items={ROADMAP.map(cat => ({
          key: cat.label,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
              <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>{cat.label}</span>
              <Badge count={cat.items.length} style={{ background: cat.color }} />
              <Badge
                count={cat.items.filter(i => created.has(i.subject)).length}
                style={{ background: '#22c55e' }}
              />
            </div>
          ),
          extra: (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => { e.stopPropagation(); createAll(cat.items); }}
            >
              Create all in category
            </Button>
          ),
          style: {
            marginBottom: 10,
            background: 'rgba(8,25,40,0.6)',
            border: '1px solid rgba(134,166,197,0.12)',
            borderRadius: 12,
          },
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cat.items.map(item => {
                const isCreated = created.has(item.subject);
                const isCreating = creating.has(item.subject);
                return (
                  <div
                    key={item.subject}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      background: isCreated ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isCreated ? 'rgba(34,197,94,0.2)' : 'rgba(134,166,197,0.1)'}`,
                      opacity: isCreated ? 0.7 : 1,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--app-text)' }}>
                          {item.subject.split(' — ')[0]}
                        </span>
                        <Tag color={PRIORITY_COLOR[item.priority]} style={{ fontSize: 10, margin: 0 }}>
                          {item.priority}
                        </Tag>
                        {item.tags.map(t => (
                          <Tag key={t} style={{ fontSize: 10, margin: 0 }}>{t}</Tag>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--app-text-muted)', lineHeight: 1.5 }}>
                        {item.subject.includes(' — ') ? item.subject.split(' — ')[1] : item.description.slice(0, 100) + '…'}
                      </div>
                    </div>
                    <Tooltip title={isCreated ? 'Ticket created' : 'Create ticket'}>
                      <Button
                        size="small"
                        type={isCreated ? 'default' : 'primary'}
                        icon={isCreated ? <CheckCircleOutlined style={{ color: '#22c55e' }} /> : <PlusOutlined />}
                        loading={isCreating}
                        disabled={isCreated}
                        onClick={() => {
                          setCreating(prev => new Set([...prev, item.subject]));
                          createMutation.mutate(item);
                        }}
                        style={{ flexShrink: 0 }}
                      >
                        {isCreated ? 'Created' : 'Create'}
                      </Button>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          ),
        }))}
      />
    </div>
  );
}
