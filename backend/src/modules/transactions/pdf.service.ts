import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { TransactionEntity } from './entities/transaction.entity';

@Injectable()
export class PdfService {
  async generateInvoice(transaction: TransactionEntity): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        doc
          .fontSize(20)
          .text('INVOICE', 50, 50, { align: 'right' })
          .fontSize(10)
          .text(`Invoice #: ${transaction.transaction_number}`, 50, 80, {
            align: 'right',
          })
          .text(
            `Date: ${transaction.transaction_date.toLocaleDateString()}`,
            50,
            95,
            { align: 'right' },
          );

        if (transaction.due_date) {
          doc.text(
            `Due Date: ${transaction.due_date.toLocaleDateString()}`,
            50,
            110,
            { align: 'right' },
          );
        }

        // Company info (left side)
        doc
          .fontSize(12)
          .text('Your Company Name', 50, 80)
          .fontSize(10)
          .text('123 Business Street', 50, 100)
          .text('City, State 12345', 50, 115)
          .text('Phone: (123) 456-7890', 50, 130)
          .text('Email: info@company.com', 50, 145);

        // Customer info
        doc
          .fontSize(12)
          .text('Bill To:', 50, 180)
          .fontSize(10)
          .text(transaction.customer_name || 'N/A', 50, 200);

        // Line
        doc.moveTo(50, 240).lineTo(550, 240).stroke();

        // Table header
        const tableTop = 260;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Item', 50, tableTop)
          .text('Qty', 300, tableTop, { width: 50, align: 'right' })
          .text('Price', 360, tableTop, { width: 80, align: 'right' })
          .text('Total', 450, tableTop, { width: 100, align: 'right' })
          .font('Helvetica');

        // Line under header
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke();

        // Items
        let yPosition = tableTop + 25;
        transaction.items.forEach((item) => {
          doc
            .fontSize(9)
            .text(item.product_name, 50, yPosition, { width: 240 })
            .text(String(item.quantity), 300, yPosition, {
              width: 50,
              align: 'right',
            })
            .text(`$${Number(item.unit_price).toFixed(2)}`, 360, yPosition, {
              width: 80,
              align: 'right',
            })
            .text(`$${Number(item.total_amount).toFixed(2)}`, 450, yPosition, {
              width: 100,
              align: 'right',
            });

          yPosition += 20;

          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
        });

        // Totals
        yPosition += 20;
        doc.moveTo(350, yPosition).lineTo(550, yPosition).stroke();

        yPosition += 10;

        doc
          .fontSize(10)
          .text('Subtotal:', 350, yPosition)
          .text(`$${Number(transaction.subtotal).toFixed(2)}`, 450, yPosition, {
            width: 100,
            align: 'right',
          });

        yPosition += 20;

        if (transaction.discount_amount > 0) {
          doc
            .text('Discount:', 350, yPosition)
            .text(
              `-$${Number(transaction.discount_amount).toFixed(2)}`,
              450,
              yPosition,
              { width: 100, align: 'right' },
            );
          yPosition += 20;
        }

        if (transaction.tax_amount > 0) {
          doc
            .text(`Tax (${transaction.tax_rate}%):`, 350, yPosition)
            .text(
              `$${Number(transaction.tax_amount).toFixed(2)}`,
              450,
              yPosition,
              { width: 100, align: 'right' },
            );
          yPosition += 20;
        }

        if (transaction.shipping_amount > 0) {
          doc
            .text('Shipping:', 350, yPosition)
            .text(
              `$${Number(transaction.shipping_amount).toFixed(2)}`,
              450,
              yPosition,
              { width: 100, align: 'right' },
            );
          yPosition += 20;
        }

        doc.moveTo(350, yPosition).lineTo(550, yPosition).stroke();

        yPosition += 10;

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Total:', 350, yPosition)
          .font('Helvetica')
          .text(
            `$${Number(transaction.total_amount).toFixed(2)}`,
            450,
            yPosition,
            { width: 100, align: 'right' },
          );

        yPosition += 20;

        if (transaction.paid_amount > 0) {
          doc
            .fontSize(10)
            .text('Paid:', 350, yPosition)
            .text(
              `$${Number(transaction.paid_amount).toFixed(2)}`,
              450,
              yPosition,
              { width: 100, align: 'right' },
            );
          yPosition += 20;
        }

        if (transaction.balance_amount > 0) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text('Balance Due:', 350, yPosition)
            .font('Helvetica')
            .text(
              `$${Number(transaction.balance_amount).toFixed(2)}`,
              450,
              yPosition,
              { width: 100, align: 'right' },
            );
        }

        // Notes
        if (transaction.notes) {
          yPosition += 40;
          doc
            .fontSize(10)
            .text('Notes:', 50, yPosition)
            .fontSize(9)
            .text(transaction.notes, 50, yPosition + 15, { width: 500 });
        }

        // Terms
        if (transaction.terms) {
          yPosition += 60;
          doc
            .fontSize(10)
            .text('Terms & Conditions:', 50, yPosition)
            .fontSize(9)
            .text(transaction.terms, 50, yPosition + 15, { width: 500 });
        }

        // Footer
        doc.fontSize(8).text('Thank you for your business!', 50, 750, {
          align: 'center',
          width: 500,
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
