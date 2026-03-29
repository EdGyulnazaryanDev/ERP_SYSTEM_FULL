import { Alert, Button, Card, Col, Empty, Row, Skeleton, Space, Tag, message } from 'antd';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  LogoutOutlined,
  NotificationOutlined,
  ShopOutlined,
  SwapOutlined,
  TruckOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { authApi, type PortalMetric, type PortalSummary } from '@/api/auth';
import { transportationApi } from '@/api/transportation';
import { useAuthStore } from '@/store/authStore';
import styles from './PortalHomePage.module.css';

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className={styles.kpiCard} styles={{ body: { padding: '16px 18px' } }}>
      <div className={styles.kpiBody}>
        <div className={styles.kpiIcon}>{icon}</div>
        <div>
          <div className={styles.kpiValue}>{value}</div>
          <div className={styles.kpiLabel}>{label}</div>
        </div>
      </div>
    </Card>
  );
}

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatMetricValue(metric: PortalMetric) {
  if (metric.value === null || metric.value === undefined) {
    return 'N/A';
  }

  if (metric.key.toLowerCase().includes('rate')) {
    return `${Math.round(metric.value)}%`;
  }

  if (
    metric.key.toLowerCase().includes('credit') ||
    metric.key.toLowerCase().includes('balance') ||
    metric.key.toLowerCase().includes('revenue') ||
    metric.key.toLowerCase().includes('value') ||
    metric.key.toLowerCase().includes('outstanding')
  ) {
    return formatMoney(metric.value);
  }

  return String(metric.value);
}

function formatDate(value?: string) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatShortDate(value?: string) {
  if (!value) {
    return 'No date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function toTitleCase(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function buildKpiIcons(summary: PortalSummary, isSupplier: boolean) {
  const fallbackIcons = isSupplier
    ? [<ShopOutlined />, <TruckOutlined />, <DollarOutlined />, <CheckCircleOutlined />]
    : [<SwapOutlined />, <TruckOutlined />, <CreditCardOutlined />, <NotificationOutlined />];

  return summary.kpis.map((metric, index) => ({
    ...metric,
    icon: fallbackIcons[index] || <FileTextOutlined />,
    displayValue: formatMetricValue(metric),
  }));
}

export default function PortalHomePage() {
  const { user, logout } = useAuthStore();
  const isSupplier = user?.actorType === 'supplier';
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  const downloadDoc = async (url: string, filename: string) => {
    setDownloadingDoc(filename);
    try {
      const blob = await transportationApi.downloadDocument(url);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      message.error('Failed to download document');
    } finally {
      setDownloadingDoc(null);
    }
  };
  const { data: summary, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['portal-summary', user?.principalId, user?.actorType],
    queryFn: () => authApi.getPortalSummary().then((res) => res.data),
    enabled: Boolean(user?.principalId && user?.actorType && user.actorType !== 'staff'),
  });

  const kpis = summary ? buildKpiIcons(summary, isSupplier) : [];
  const profileName = isSupplier
    ? summary?.supplier?.name || user?.name || 'Supplier account'
    : summary?.customer?.companyName || user?.name || 'Customer account';
  const subtitle = isSupplier
    ? 'Live supplier-facing view of purchasing, inbound shipments, and accounts payable linked to your portal account.'
    : 'Live customer-facing view of sales orders, receivables, shipment execution, quotes, and CRM activity linked to your account.';

  return (
    <div className={`${styles.page} ${isSupplier ? styles.supplier : styles.customer}`}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroTop}>
            <div>
              <div className={styles.eyebrow}>
                {isSupplier ? <ShopOutlined /> : <UserOutlined />}
                {isSupplier ? 'Supplier Portal' : 'Customer Portal'}
              </div>
              <h1 className={styles.title}>{profileName}</h1>
              <p className={styles.subtitle}>{subtitle}</p>
            </div>
            <Space className={styles.heroActions}>
              <Button className={styles.softButton} onClick={() => refetch()} loading={isFetching}>
                Refresh data
              </Button>
              <Button className={styles.softButton}>
                <Link to="/auth/login">Switch account</Link>
              </Button>
              <Button danger className={styles.softButton} icon={<LogoutOutlined />} onClick={logout}>
                Sign out
              </Button>
            </Space>
          </div>

          {isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : error ? (
            <Alert
              type="error"
              message="Portal data could not be loaded"
              description="The portal account is authenticated, but the live customer or supplier summary request failed."
              showIcon
            />
          ) : (
            <div className={styles.heroMeta}>
              {summary?.heroStats.map((item) => (
                <div key={item.label} className={styles.heroMetaCard}>
                  <span className={styles.heroMetaLabel}>{item.label}</span>
                  <span className={styles.heroMetaValue}>{item.value ?? 'N/A'}</span>
                  <span className={styles.heroMetaHint}>{item.hint}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          {(isLoading ? new Array(4).fill(null) : kpis).map((item, index) => (
            <Col key={item?.label || index} xs={24} sm={12} lg={6}>
              {isLoading ? (
                <Card className={styles.kpiCard} styles={{ body: { padding: '16px 18px' } }}>
                  <Skeleton active paragraph={{ rows: 1 }} />
                </Card>
              ) : item ? (
                <KpiCard icon={item.icon} label={item.label} value={item.displayValue} />
              ) : null}
            </Col>
          ))}
        </Row>

        <Card className={styles.workspace} styles={{ body: { padding: '20px' } }}>
          <div className={styles.workspaceHeader}>
            <div>
              <h2 className={styles.panelTitle}>
                {isSupplier ? 'Supplier collaboration workspace' : 'Customer account workspace'}
              </h2>
              <p className={styles.panelText}>
                {isSupplier
                  ? 'This view is now sourced from purchase transactions, shipment records, and payables linked to the signed-in supplier.'
                  : 'This view is now sourced from CRM, sales transactions, receivables, quotes, and shipment records linked to the signed-in customer.'}
              </p>
            </div>
            <Tag color={isSupplier ? 'cyan' : 'green'}>
              {user?.actorType?.toUpperCase()} ACCESS
            </Tag>
          </div>

          {isLoading ? (
            <Skeleton active paragraph={{ rows: 10 }} />
          ) : summary ? (
            <div className={styles.workspaceGrid}>
              <div className={styles.stack}>
                <Card className={styles.panel} styles={{ body: { padding: '18px' } }}>
                  <h3 className={styles.panelTitle}>Account Context</h3>
                  <div className={styles.dataGrid} style={{ marginTop: 14 }}>
                    {summary.accountContext.map((item) => (
                      <div key={item.label} className={styles.dataItem}>
                        <span className={styles.dataLabel}>{item.label}</span>
                        <span className={styles.dataValue}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className={styles.panel} styles={{ body: { padding: '18px' } }}>
                  <h3 className={styles.panelTitle}>Cross-Module Snapshot</h3>
                  <div className={styles.actionGrid} style={{ marginTop: 14 }}>
                    {summary.actionCards.map((item) => (
                      <div key={item.title} className={styles.actionCard}>
                        <h4 className={styles.actionTitle}>{item.title}</h4>
                        <p className={styles.actionText}>{item.text}</p>
                        <div className={styles.tagRow}>
                          {item.tags.map((tag) => (
                            <span key={tag} className={styles.miniTag}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className={styles.panel} styles={{ body: { padding: '18px' } }}>
                  <h3 className={styles.panelTitle}>Live Records</h3>
                  <div className={styles.recordGrid}>
                    <div className={styles.recordSection}>
                      <div className={styles.recordHeading}>Recent Orders</div>
                      {summary.recentOrders.length ? summary.recentOrders.map((order) => (
                        <div key={order.id} className={styles.recordRow}>
                          <div>
                            <div className={styles.recordTitle}>{order.number}</div>
                            <div className={styles.recordMeta}>
                              {toTitleCase(order.status)} • {order.itemCount} items • {formatShortDate(order.date)}
                            </div>
                          </div>
                          <div className={styles.recordValue}>{formatMoney(order.totalAmount)}</div>
                        </div>
                      )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No orders linked to this portal account" />}
                    </div>

                    <div className={styles.recordSection}>
                      <div className={styles.recordHeading}>Recent Shipments</div>
                      {summary.recentShipments.length ? summary.recentShipments.map((shipment) => (
                        <div key={shipment.id} className={styles.recordRow}>
                          <div>
                            <div className={styles.recordTitle}>{shipment.trackingNumber}</div>
                            <div className={styles.recordMeta}>
                              {toTitleCase(shipment.status)} • {shipment.destinationCity || shipment.destinationName}
                            </div>
                            <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
                              {shipment.status !== 'pending' && shipment.status !== 'cancelled' && (
                                <Button
                                  size="small"
                                  icon={<FileTextOutlined />}
                                  loading={downloadingDoc === `packing-slip-${shipment.trackingNumber}.pdf`}
                                  onClick={() => downloadDoc(
                                    transportationApi.getPortalPackingSlipUrl(shipment.trackingNumber),
                                    `packing-slip-${shipment.trackingNumber}.pdf`,
                                  )}
                                  style={{ fontSize: 11 }}
                                >
                                  Packing Slip
                                </Button>
                              )}
                              {shipment.status === 'delivered' && (
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<FilePdfOutlined />}
                                  loading={downloadingDoc === `delivery-confirmation-${shipment.trackingNumber}.pdf`}
                                  onClick={() => downloadDoc(
                                    transportationApi.getPortalDeliveryConfirmationUrl(shipment.trackingNumber),
                                    `delivery-confirmation-${shipment.trackingNumber}.pdf`,
                                  )}
                                  style={{ fontSize: 11, background: '#16a34a', borderColor: '#16a34a' }}
                                >
                                  Delivery Confirmation
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className={styles.recordValue}>
                            {formatShortDate(shipment.actualDeliveryDate || shipment.estimatedDeliveryDate || shipment.updatedAt)}
                          </div>
                        </div>
                      )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No shipment records linked yet" />}
                    </div>

                    {!isSupplier && (
                      <div className={styles.recordSection}>
                        <div className={styles.recordHeading}>Receivables</div>
                        {summary.receivables.length ? summary.receivables.map((invoice) => (
                          <div key={invoice.id} className={styles.recordRow}>
                            <div>
                              <div className={styles.recordTitle}>{invoice.invoiceNumber}</div>
                              <div className={styles.recordMeta}>
                                {toTitleCase(invoice.status)} • due {formatShortDate(invoice.dueDate)}
                              </div>
                            </div>
                            <div className={styles.recordValue}>{formatMoney(invoice.balanceAmount)}</div>
                          </div>
                        )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No receivables linked to this customer" />}
                      </div>
                    )}

                    {!isSupplier && (
                      <div className={styles.recordSection}>
                        <div className={styles.recordHeading}>Quotes and CRM</div>
                        {summary.quotes.length ? summary.quotes.map((quote) => (
                          <div key={quote.id} className={styles.recordRow}>
                            <div>
                              <div className={styles.recordTitle}>{quote.quoteNumber}</div>
                              <div className={styles.recordMeta}>
                                {toTitleCase(quote.status)} • valid until {formatShortDate(quote.validUntil)}
                              </div>
                            </div>
                            <div className={styles.recordValue}>{formatMoney(quote.totalAmount)}</div>
                          </div>
                        )) : summary.activities.length ? summary.activities.map((activity) => (
                          <div key={activity.id} className={styles.recordRow}>
                            <div>
                              <div className={styles.recordTitle}>{activity.subject}</div>
                              <div className={styles.recordMeta}>
                                {toTitleCase(activity.type)} • {toTitleCase(activity.status)}
                              </div>
                            </div>
                            <div className={styles.recordValue}>{formatShortDate(activity.startDateTime)}</div>
                          </div>
                        )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No quotes or CRM activity linked yet" />}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <Card className={styles.timelinePanel} styles={{ body: { padding: '18px' } }}>
                <h3 className={styles.panelTitle}>Recent Activity</h3>
                <p className={styles.panelText}>
                  {isSupplier
                    ? 'Chronological purchase, shipment, and payable events related to this supplier account.'
                    : 'Chronological CRM, order, invoice, quote, and shipment events related to this customer account.'}
                </p>
                <div className={styles.timeline} style={{ marginTop: 14 }}>
                  {summary.timeline.length ? summary.timeline.map((item) => (
                    <div key={`${item.date}-${item.title}`} className={styles.timelineItem}>
                      <div className={styles.timelineStamp}>{formatShortDate(item.date)}</div>
                      <div>
                        <div className={styles.timelineTitle}>{item.title}</div>
                        <div className={styles.timelineText}>{item.text}</div>
                      </div>
                    </div>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent linked events" />}
                </div>

                <div className={styles.analyticsPanel}>
                  <h3 className={styles.panelTitle}>Analysis</h3>
                  {summary.analytics ? (
                    <div className={styles.dataGrid} style={{ marginTop: 14 }}>
                      <div className={styles.dataItem}>
                        <span className={styles.dataLabel}>Average order value</span>
                        <span className={styles.dataValue}>{formatMoney(summary.analytics.averageOrderValue)}</span>
                      </div>
                      <div className={styles.dataItem}>
                        <span className={styles.dataLabel}>Lifetime revenue</span>
                        <span className={styles.dataValue}>{formatMoney(summary.analytics.lifetimeRevenue)}</span>
                      </div>
                      <div className={styles.dataItem}>
                        <span className={styles.dataLabel}>Outstanding exposure</span>
                        <span className={styles.dataValue}>{formatMoney(summary.analytics.outstandingBalance)}</span>
                      </div>
                      <div className={styles.dataItem}>
                        <span className={styles.dataLabel}>On-time delivery</span>
                        <span className={styles.dataValue}>
                          {summary.analytics.onTimeDeliveryRate === null
                            ? 'N/A'
                            : `${Math.round(summary.analytics.onTimeDeliveryRate)}%`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.panelText} style={{ marginTop: 14 }}>
                      Analytics are not available for this actor type yet.
                    </div>
                  )}
                </div>

                <Space wrap style={{ marginTop: 18 }}>
                  <Button className={styles.primaryButton} type="primary" icon={<FileTextOutlined />}>
                    {isSupplier ? 'Review Purchase Flow' : 'Review Customer Flow'}
                  </Button>
                  <Button className={styles.softButton} icon={<ClockCircleOutlined />}>
                    Synced {formatDate(summary.generatedAt)}
                  </Button>
                </Space>
              </Card>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
