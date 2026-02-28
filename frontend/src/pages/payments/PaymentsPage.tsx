import { Tabs } from 'antd';
import PaymentsTab from './PaymentsTab';
import PaymentMethodsTab from './PaymentMethodsTab';

export default function PaymentsPage() {
  const items = [
    { key: 'payments', label: 'Payments', children: <PaymentsTab /> },
    { key: 'methods', label: 'Payment Methods', children: <PaymentMethodsTab /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Payments</h1>
      <Tabs items={items} />
    </div>
  );
}
