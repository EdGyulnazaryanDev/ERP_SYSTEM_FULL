import { Input, Select, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ModuleField } from '@/types';

interface SearchBarProps {
  fields: ModuleField[];
  onSearch: (value: string, field?: string) => void;
  placeholder?: string;
}

export default function SearchBar({ fields, onSearch, placeholder = 'Search...' }: SearchBarProps) {
  const handleSearch = (value: string) => {
    onSearch(value);
  };

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select
        defaultValue="all"
        style={{ width: 150 }}
        options={[
          { label: 'All Fields', value: 'all' },
          ...fields.map((field) => ({
            label: field.displayName,
            value: field.name,
          })),
        ]}
      />
      <Input.Search
        placeholder={placeholder}
        allowClear
        enterButton={<SearchOutlined />}
        onSearch={handleSearch}
        style={{ width: 'calc(100% - 150px)' }}
      />
    </Space.Compact>
  );
}
