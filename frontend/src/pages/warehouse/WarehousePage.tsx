import { Tabs } from 'antd';
import WarehousesTab from './WarehousesTab';
import BinsTab from './BinsTab';
import StockMovementsTab from './StockMovementsTab';

export default function WarehousePage() {
  const items = [
    { key: 'warehouses', label: 'Warehouses', children: <WarehousesTab /> },
    { key: 'bins', label: 'Bins & Locations', children: <BinsTab /> },
    { key: 'movements', label: 'Stock Movements', children: <StockMovementsTab /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Warehouse Management</h1>
      <Tabs items={items} />
    </div>
  );
}
