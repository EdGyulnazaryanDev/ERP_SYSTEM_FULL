import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type { TransactionEntity } from './entities/transaction.entity';

@Injectable()
export class ExcelService {
  async exportTransactions(
    transactions: TransactionEntity[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Define columns
    worksheet.columns = [
      { header: 'Transaction #', key: 'transaction_number', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Date', key: 'transaction_date', width: 15 },
      { header: 'Customer/Supplier', key: 'party_name', width: 30 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Tax', key: 'tax_amount', width: 15 },
      { header: 'Discount', key: 'discount_amount', width: 15 },
      { header: 'Shipping', key: 'shipping_amount', width: 15 },
      { header: 'Total', key: 'total_amount', width: 15 },
      { header: 'Paid', key: 'paid_amount', width: 15 },
      { header: 'Balance', key: 'balance_amount', width: 15 },
      { header: 'Payment Method', key: 'payment_method', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data
    transactions.forEach((transaction) => {
      worksheet.addRow({
        transaction_number: transaction.transaction_number,
        type: transaction.type.toUpperCase(),
        status: transaction.status.toUpperCase(),
        transaction_date: transaction.transaction_date,
        party_name: transaction.customer_name || transaction.supplier_name || 'N/A',
        subtotal: Number(transaction.subtotal),
        tax_amount: Number(transaction.tax_amount),
        discount_amount: Number(transaction.discount_amount),
        shipping_amount: Number(transaction.shipping_amount),
        total_amount: Number(transaction.total_amount),
        paid_amount: Number(transaction.paid_amount),
        balance_amount: Number(transaction.balance_amount),
        payment_method: transaction.payment_method || 'N/A',
        notes: transaction.notes || '',
      });
    });

    // Format currency columns
    const currencyColumns = ['subtotal', 'tax_amount', 'discount_amount', 'shipping_amount', 'total_amount', 'paid_amount', 'balance_amount'];
    currencyColumns.forEach((col) => {
      const column = worksheet.getColumn(col);
      column.numFmt = '$#,##0.00';
    });

    // Format date column
    worksheet.getColumn('transaction_date').numFmt = 'yyyy-mm-dd';

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportTransactionDetails(
    transaction: TransactionEntity,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Value', key: 'value', width: 40 },
    ];

    summarySheet.getRow(1).font = { bold: true };
    
    summarySheet.addRows([
      { field: 'Transaction Number', value: transaction.transaction_number },
      { field: 'Type', value: transaction.type.toUpperCase() },
      { field: 'Status', value: transaction.status.toUpperCase() },
      { field: 'Date', value: transaction.transaction_date.toLocaleDateString() },
      { field: 'Customer/Supplier', value: transaction.customer_name || transaction.supplier_name || 'N/A' },
      { field: 'Subtotal', value: `$${Number(transaction.subtotal).toFixed(2)}` },
      { field: 'Tax', value: `$${Number(transaction.tax_amount).toFixed(2)}` },
      { field: 'Discount', value: `$${Number(transaction.discount_amount).toFixed(2)}` },
      { field: 'Shipping', value: `$${Number(transaction.shipping_amount).toFixed(2)}` },
      { field: 'Total', value: `$${Number(transaction.total_amount).toFixed(2)}` },
      { field: 'Paid', value: `$${Number(transaction.paid_amount).toFixed(2)}` },
      { field: 'Balance', value: `$${Number(transaction.balance_amount).toFixed(2)}` },
      { field: 'Payment Method', value: transaction.payment_method || 'N/A' },
    ]);

    // Items sheet
    const itemsSheet = workbook.addWorksheet('Items');
    itemsSheet.columns = [
      { header: 'Product', key: 'product_name', width: 30 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Unit Price', key: 'unit_price', width: 15 },
      { header: 'Discount', key: 'discount_amount', width: 15 },
      { header: 'Tax', key: 'tax_amount', width: 15 },
      { header: 'Total', key: 'total_amount', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    itemsSheet.getRow(1).font = { bold: true };
    itemsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    itemsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    transaction.items.forEach((item) => {
      itemsSheet.addRow({
        product_name: item.product_name,
        sku: item.sku || 'N/A',
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        discount_amount: Number(item.discount_amount),
        tax_amount: Number(item.tax_amount),
        total_amount: Number(item.total_amount),
        notes: item.notes || '',
      });
    });

    // Format currency columns
    ['unit_price', 'discount_amount', 'tax_amount', 'total_amount'].forEach((col) => {
      const column = itemsSheet.getColumn(col);
      column.numFmt = '$#,##0.00';
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importTransactions(buffer: Buffer): Promise<any[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.getWorksheet('Transactions');
    if (!worksheet) {
      throw new Error('Worksheet "Transactions" not found');
    }

    const transactions: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      transactions.push({
        type: String(row.getCell(2).value).toLowerCase(),
        transaction_date: row.getCell(4).value,
        customer_name: row.getCell(5).value,
        subtotal: Number(row.getCell(6).value) || 0,
        tax_amount: Number(row.getCell(7).value) || 0,
        discount_amount: Number(row.getCell(8).value) || 0,
        shipping_amount: Number(row.getCell(9).value) || 0,
        paid_amount: Number(row.getCell(11).value) || 0,
        payment_method: String(row.getCell(13).value).toLowerCase(),
        notes: row.getCell(14).value,
      });
    });

    return transactions;
  }
}
