import { Tabs } from 'antd';
import WorkOrdersTab from './WorkOrdersTab';
import BOMTab from './BOMTab';
import ProductionLinesTab from './ProductionLinesTab';

export default function ManufacturingPage() {
  const items = [
    { key: 'work-orders', label: 'Work Orders', children: <WorkOrdersTab /> },
    { key: 'bom', label: 'Bill of Materials', children: <BOMTab /> },
    { key: 'production-lines', label: 'Production Lines', children: <ProductionLinesTab /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Manufacturing</h1>
      <Tabs items={items} />
    </div>
  );
}
