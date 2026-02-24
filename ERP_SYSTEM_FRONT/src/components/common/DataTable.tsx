import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Select, DatePicker, Tag } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined, ExportOutlined } from '@ant-design/icons';
import type { TableProps, ColumnsType } from 'antd/es/table';
import type { FilterOperator, SortOption } from '@/services/BaseService';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export interface DataTableColumn<T = unknown> {
  key: string;
  title: string;
  dataIndex?: string | string[];
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'date' | 'number' | 'dateRange';
  filterOptions?: Array<{ label: string; value: unknown }>;
  sortable?: boolean;
  width?: number | string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  onFilterChange?: (filters: FilterOperator[]) => void;
  onSortChange?: (sort: SortOption[]) => void;
  onExport?: () => void;
  rowKey?: string | ((record: T) => string);
  rowSelection?: TableProps<T>['rowSelection'];
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  total,
  page = 1,
  pageSize = 10,
  onPageChange,
  onFilterChange,
  onSortChange,
  onExport,
  rowKey = 'id',
  rowSelection,
}: DataTableProps<T>) {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [activeFilters, setActiveFilters] = useState<FilterOperator[]>([]);

  useEffect(() => {
    const filterArray: FilterOperator[] = Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([field, value]) => {
        if (Array.isArray(value) && value.length === 2) {
          return { field, operator: 'between' as const, value };
        }
        if (typeof value === 'string') {
          return { field, operator: 'like' as const, value };
        }
        return { field, operator: 'eq' as const, value };
      });

    setActiveFilters(filterArray);
    onFilterChange?.(filterArray);
  }, [filters, onFilterChange]);

  const handleFilterChange = (field: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const tableColumns: ColumnsType<T> = columns.map((col) => ({
    key: col.key,
    title: col.title,
    dataIndex: col.dataIndex,
    render: col.render,
    width: col.width,
    sorter: col.sortable,
    filterDropdown: col.filterable
      ? ({ close }) => (
          <div className="p-4 w-64">
            {col.filterType === 'select' ? (
              <Select
                className="w-full"
                placeholder={`Filter ${col.title}`}
                value={filters[col.key]}
                onChange={(value) => handleFilterChange(col.key, value)}
                options={col.filterOptions}
                allowClear
              />
            ) : col.filterType === 'dateRange' ? (
              <RangePicker
                className="w-full"
                value={
                  filters[col.key] && Array.isArray(filters[col.key])
                    ? [dayjs((filters[col.key] as string[])[0]), dayjs((filters[col.key] as string[])[1])]
                    : null
                }
                onChange={(dates) => {
                  if (dates) {
                    handleFilterChange(col.key, [
                      dates[0]?.toISOString(),
                      dates[1]?.toISOString(),
                    ]);
                  } else {
                    handleFilterChange(col.key, null);
                  }
                }}
              />
            ) : col.filterType === 'number' ? (
              <Input
                type="number"
                placeholder={`Filter ${col.title}`}
                value={filters[col.key] as string}
                onChange={(e) => handleFilterChange(col.key, e.target.value)}
              />
            ) : (
              <Input
                placeholder={`Search ${col.title}`}
                value={filters[col.key] as string}
                onChange={(e) => handleFilterChange(col.key, e.target.value)}
                prefix={<SearchOutlined />}
              />
            )}
            <div className="mt-2 flex justify-end">
              <Button size="small" onClick={() => close?.()}>
                Close
              </Button>
            </div>
          </div>
        )
      : undefined,
    filterIcon: col.filterable ? (
      <FilterOutlined style={{ color: filters[col.key] ? '#1890ff' : undefined }} />
    ) : undefined,
  }));

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <Space>
          {activeFilters.length > 0 && (
            <>
              <span className="text-gray-600">Active Filters:</span>
              {activeFilters.map((filter, index) => (
                <Tag
                  key={index}
                  closable
                  onClose={() => handleFilterChange(filter.field, null)}
                >
                  {filter.field}: {String(filter.value)}
                </Tag>
              ))}
              <Button
                size="small"
                icon={<ClearOutlined />}
                onClick={clearFilters}
              >
                Clear All
              </Button>
            </>
          )}
        </Space>
        {onExport && (
          <Button icon={<ExportOutlined />} onClick={onExport}>
            Export
          </Button>
        )}
      </div>

      <Table<T>
        columns={tableColumns}
        dataSource={data}
        loading={loading}
        rowKey={rowKey}
        rowSelection={rowSelection}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
          onChange: onPageChange,
        }}
        onChange={(_pagination, _filters, sorter) => {
          if (!Array.isArray(sorter) && sorter.order) {
            onSortChange?.([
              {
                field: sorter.field as string,
                order: sorter.order === 'ascend' ? 'asc' : 'desc',
              },
            ]);
          }
        }}
      />
    </div>
  );
}
