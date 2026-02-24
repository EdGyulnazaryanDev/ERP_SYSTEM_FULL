import { Form, Input, InputNumber, DatePicker, Switch, Select, Button } from 'antd';
import type { FormInstance } from 'antd';
import type { ModuleField } from '@/types';
import dayjs from 'dayjs';

interface DynamicFormProps {
  form: FormInstance;
  fields: ModuleField[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  loading?: boolean;
  submitText?: string;
  showCancel?: boolean;
  onCancel?: () => void;
}

export default function DynamicForm({
  form,
  fields,
  initialValues,
  onSubmit,
  loading,
  submitText = 'Submit',
  showCancel = true,
  onCancel,
}: DynamicFormProps) {
  const renderField = (field: ModuleField) => {
    const commonProps = {
      placeholder: `Enter ${field.displayName}`,
    };

    switch (field.type) {
      case 'text':
        return <Input {...commonProps} />;

      case 'email':
        return <Input {...commonProps} type="email" />;

      case 'phone':
        return <Input {...commonProps} type="tel" />;

      case 'url':
        return <Input {...commonProps} type="url" />;

      case 'number':
        return (
          <InputNumber
            {...commonProps}
            className="w-full"
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'date':
        return <DatePicker className="w-full" format="YYYY-MM-DD" />;

      case 'boolean':
        return <Switch />;

      case 'select':
        return (
          <Select
            {...commonProps}
            options={field.validation?.options?.map((opt) => ({
              label: opt,
              value: opt,
            }))}
          />
        );

      case 'multiselect':
        return (
          <Select
            {...commonProps}
            mode="multiple"
            options={field.validation?.options?.map((opt) => ({
              label: opt,
              value: opt,
            }))}
          />
        );

      case 'reference':
        return (
          <Select
            {...commonProps}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        );

      default:
        return <Input {...commonProps} />;
    }
  };

  const getInitialValue = (field: ModuleField) => {
    if (initialValues && initialValues[field.name] !== undefined) {
      if (field.type === 'date' && initialValues[field.name]) {
        return dayjs(initialValues[field.name] as string);
      }
      return initialValues[field.name];
    }
    return field.defaultValue;
  };

  const transformValues = (values: Record<string, unknown>) => {
    const transformed: Record<string, unknown> = {};
    
    fields.forEach((field) => {
      if (values[field.name] !== undefined) {
        if (field.type === 'date' && values[field.name]) {
          transformed[field.name] = dayjs(values[field.name] as string).toISOString();
        } else {
          transformed[field.name] = values[field.name];
        }
      }
    });

    return transformed;
  };

  const handleFinish = (values: Record<string, unknown>) => {
    const transformed = transformValues(values);
    onSubmit(transformed);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={
        initialValues
          ? Object.fromEntries(
              fields.map((field) => [field.name, getInitialValue(field)])
            )
          : undefined
      }
    >
      {fields.map((field) => (
        <Form.Item
          key={field.name}
          name={field.name}
          label={field.displayName}
          rules={[
            {
              required: field.required,
              message: `${field.displayName} is required`,
            },
            ...(field.validation?.pattern
              ? [
                  {
                    pattern: new RegExp(field.validation.pattern),
                    message: `Invalid ${field.displayName} format`,
                  },
                ]
              : []),
            ...(field.validation?.min !== undefined
              ? [
                  {
                    type: 'number' as const,
                    min: field.validation.min,
                    message: `Minimum value is ${field.validation.min}`,
                  },
                ]
              : []),
            ...(field.validation?.max !== undefined
              ? [
                  {
                    type: 'number' as const,
                    max: field.validation.max,
                    message: `Maximum value is ${field.validation.max}`,
                  },
                ]
              : []),
          ]}
          valuePropName={field.type === 'boolean' ? 'checked' : 'value'}
        >
          {renderField(field)}
        </Form.Item>
      ))}

      <Form.Item>
        <div className="flex gap-2">
          <Button type="primary" htmlType="submit" loading={loading}>
            {submitText}
          </Button>
          {showCancel && (
            <Button onClick={onCancel}>Cancel</Button>
          )}
        </div>
      </Form.Item>
    </Form>
  );
}
