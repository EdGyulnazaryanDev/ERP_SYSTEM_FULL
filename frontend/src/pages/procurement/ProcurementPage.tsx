import { Tabs } from 'antd';
import PurchaseOrdersTab from './PurchaseOrdersTab';
import PurchaseRequisitionsTab from './PurchaseRequisitionsTab';
import VendorsTab from './VendorsTab';

export default function ProcurementPage() {
  const items = [
    { key: 'purchase-orders', label: 'Purchase Orders', children: <PurchaseOrdersTab /> },
    { key: 'requisitions', label: 'Requisitions', children: <PurchaseRequisitionsTab /> },
    { key: 'vendors', label: 'Vendors', children: <VendorsTab /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Procurement</h1>
      <Tabs items={items} />
    </div>
  );
}
