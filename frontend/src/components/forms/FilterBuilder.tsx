import { useState } from 'react';
import { Button, Select, Input, Space, Card } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { FilterOperator } from '@/services/BaseService';
import type { ModuleField } from '@/types';

interface FilterBuilderProps {
  fields: ModuleField[];
  onFilterChange: (filters: FilterOperator[]) => void;
}

const operatorOptions = [
  { label: 'Equals', value: 'eq' },
  { label: 'Not Equals', value: 'ne' },
  { label: 'Greater Than', value: 'gt' },
  { label: 'Greater or Equal', value: 'gte' },
  { label: 'Less Than', value: 'lt' },
  { label: 'Less or Equal', value: 'lte' },
  { label: 'Contains', value: 'like' },
  { label: 'In', value: 'in' },
];

export default function FilterBuilder({ fields, onFilterChange }: FilterBuilderProps) {
  const [filters, setFilters] = useState<FilterOperator[]>([]);

  const addFilter = () => {
    const newFilter: FilterOperator = {
      field: fields[0]?.name || '',
      operator: 'eq',
      value: '',
    };
    const updated = [...filters, newFilter];
    setFilters(updated);
    onFilterChange(updated);
  };

  const removeFilter = (index: number) => {
    const updated = filters.filter((_, i) => i !== index);
    setFilters(updated);
    onFilterChange(updated);
  };

  const updateFilter = (index: number, updates: Partial<FilterOperator>) => {
    const updated = filters.map((filter, i) =>
      i === index ? { ...filter, ...updates } : filter
    );
    setFilters(updated);
    onFilterChange(updated);
  };

  const clearAll = () => {
    setFilters([]);
    onFilterChange([]);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        <Space>
          <Button icon={<PlusOutlined />} onClick={addFilter}>
            Add Filter
          </Button>
          {filters.length > 0 && (
            <Button onClick={clearAll}>Clear All</Button>
          )}
        </Space>
      </div>

      <Space direction="vertical" className="w-full" size="middle">
        {filters.map((filter, index) => (
          <Card key={index} size="small">
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <Select
                  className="w-full"
                  value={filter.field}
                  onChange={(value) => updateFilter(index, { field: value })}
                  options={fields.map((field) => ({
                    label: field.displayName,
                    value: field.name,
                  }))}
                />
              </div>
              <div className="col-span-3">
                <Select
                  className="w-full"
                  value={filter.operator}
                  onChange={(value) => updateFilter(index, { operator: value })}
                  options={operatorOptions}
                />
              </div>
              <div className="col-span-4">
                <Input
                  value={filter.value as string}
                  onChange={(e) => updateFilter(index, { value: e.target.value })}
                  placeholder="Value"
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeFilter(index)}
                />
              </div>
            </div>
          </Card>
        ))}
      </Space>
    </div>
  );
}
