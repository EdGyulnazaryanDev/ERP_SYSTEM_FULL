import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Card,
  Table,
  Space,
  message,
  Row,
  Col,
  Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { transactionsApi } from '@/api/transactions';
import dayjs from 'dayjs';

const { TextArea } = Input;

export default function TransactionFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [items, setItems] = useState<any[]>([]);

  // Fetch transaction if editing
  const { data: transaction, isLoading } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionsApi.getById(id!).then(res => res.data),
    enabled: !!id,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (id) {
        return transactionsApi.update(id, data);
      }
      return transactionsApi.create(data);
    },
    onSuccess: () => {
      message.success(`Transaction ${id ? 'updated' : 'created'} successfully`);
      navigate('/transactions');
    },
    onError: () => {
      message.error('Failed to save transaction');
    },
  });

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        key: Date.now(),
        product_name: '',
        sku: '',
        quantity: 1,
        unit_price: 0,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (key: number) => {
    setItems(items.filter(item => item.key !== key));
  };

  const handleItemChange = (key: number, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.key === key) {
        const updated = { ...item, [field]: value };
        // Calculate total
        const subtotal = (updated.quantity || 0) * (updated.unit_price || 0);
        const discount = updated.discount_amount || 0;
        const tax = updated.tax_amount || 0;
        updated.total_amount = subtotal - discount + tax;
        return updated;
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.unit_price || 0) - (item.discount_amount || 0));
    }, 0);
    const taxAmount = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleSubmit = (values: any) => {
    const { subtotal, taxAmount, totalAmount } = calculateTotals();
    
    const data = {
      ...values,
      transaction_date: values.transaction_date?.format('YYYY-MM-DD'),
      due_date: values.due_date?.format('YYYY-MM-DD'),
      items: items.map(({ key, ...item }) => item),
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      paid_amount: values.paid_amount || 0,
      balance_amount: totalAmount - (values.paid_amount || 0),
    };

    saveMutation.mutate(data);
  };

  const itemColumns = [
    {
      title: 'Product Name',
      dataIndex: 'product_name',
      width: 200,
      render: (_: any, record: any) => (
        <Input
          value={record.product_name}
          onChange={(e) => handleItemChange(record.key, 'product_name', e.target.value)}
          placeholder="Product name"
        />
      ),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      width: 120,
      render: (_: any, record: any) => (
        <Input
          value={record.sku}
          onChange={(e) => handleItemChange(record.key, 'sku', e.target.value)}
          placeholder="SKU"
        />
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      width: 100,
      render: (_: any, record: any) => (
        <InputNumber
          value={record.quantity}
          onChange={(value) => handleItemChange(record.key, 'quantity', value)}
          min={1}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      width: 120,
      render: (_: any, record: any) => (
        <InputNumber
          value={record.unit_price}
          onChange={(value) => handleItemChange(record.key, 'unit_price', value)}
          min={0}
          precision={2}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Discount',
      dataIndex: 'discount_amount',
      width: 100,
      render: (_: any, record: any) => (
        <InputNumber
          value={record.discount_amount}
          onChange={(value) => handleItemChange(record.key, 'discount_amount', value)}
          min={0}
          precision={2}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Tax',
      dataIndex: 'tax_amount',
      width: 100,
      render: (_: any, record: any) => (
        <InputNumber
          value={record.tax_amount}
          onChange={(value) => handleItemChange(record.key, 'tax_amount', value)}
          min={0}
          precision={2}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      width: 120,
      render: (_: any, record: any) => `$${record.total_amount.toFixed(2)}`,
    },
    {
      title: 'Action',
      width: 80,
      render: (_: any, record: any) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(record.key)}
        />
      ),
    },
  ];

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={id ? 'Edit Transaction' : 'New Transaction'}
        extra={
          <Space>
            <Button onClick={() => navigate('/transactions')}>Cancel</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => form.submit()}
              loading={saveMutation.isPending}
            >
              Save
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={transaction ? {
            ...transaction,
            transaction_date: dayjs(transaction.transaction_date),
            due_date: transaction.due_date ? dayjs(transaction.due_date) : null,
          } : {
            type: 'sale',
            status: 'draft',
            transaction_date: dayjs(),
          }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Transaction Type"
                name="type"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="sale">Sale</Select.Option>
                  <Select.Option value="purchase">Purchase</Select.Option>
                  <Select.Option value="return">Return</Select.Option>
                  <Select.Option value="adjustment">Adjustment</Select.Option>
                  <Select.Option value="transfer">Transfer</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Transaction Date"
                name="transaction_date"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Due Date" name="due_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Customer Name" name="customer_name">
                <Input placeholder="Customer name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Supplier Name" name="supplier_name">
                <Input placeholder="Supplier name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Payment Method" name="payment_method">
                <Select>
                  <Select.Option value="cash">Cash</Select.Option>
                  <Select.Option value="card">Card</Select.Option>
                  <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
                  <Select.Option value="check">Check</Select.Option>
                  <Select.Option value="other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Paid Amount" name="paid_amount">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="$"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Notes" name="notes">
            <TextArea rows={3} placeholder="Additional notes" />
          </Form.Item>
        </Form>

        <Divider>Items</Divider>

        <Button
          type="dashed"
          onClick={handleAddItem}
          icon={<PlusOutlined />}
          style={{ marginBottom: 16, width: '100%' }}
        >
          Add Item
        </Button>

        <Table
          columns={itemColumns}
          dataSource={items}
          pagination={false}
          scroll={{ x: 1000 }}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <strong>Subtotal:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong>${subtotal.toFixed(2)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <strong>Tax:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong>${taxAmount.toFixed(2)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <strong>Total:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong>${totalAmount.toFixed(2)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </div>
  );
}
