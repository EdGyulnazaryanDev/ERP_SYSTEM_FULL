/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ShipmentEntity, ShipmentStatus } from './entities/shipment.entity';
import { registerFonts, FONT, PAGE_W, MARGIN, CONTENT_W, footerText } from '../../common/pdf/pdf-utils';

@Injectable()
export class ShipmentDocumentService {

  async generatePackingSlip(shipment: ShipmentEntity): Promise<Buffer> {
    return this.buildPdf((doc) => this.renderPackingSlip(doc, shipment));
  }

  async generateDeliveryConfirmation(shipment: ShipmentEntity): Promise<Buffer> {
    return this.buildPdf((doc) => this.renderDeliveryConfirmation(doc, shipment));
  }

  private buildPdf(render: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: true, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      registerFonts(doc);
      render(doc);
      doc.end();
    });
  }

  // ── Packing Slip ────────────────────────────────────────────────────────────
  private renderPackingSlip(doc: PDFKit.PDFDocument, shipment: ShipmentEntity) {
    const primary = '#1a3a5c';
    const accent  = '#0ea5e9';
    const light   = '#f0f4f8';
    const footerH = 50;
    const safeBottom = () => doc.page.height - footerH - MARGIN;

    // ── Header ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 75).fill(primary);
    doc.fillColor('#fff').fontSize(18).font(FONT.bold)
      .text('PACKING SLIP / DELIVERY ORDER', MARGIN, 18, { width: CONTENT_W });
    doc.fontSize(9).font(FONT.regular)
      .text(`Tracking: ${shipment.tracking_number}`, MARGIN, 48);
    doc.text(`Date: ${new Date(shipment.created_at).toLocaleDateString()}`, MARGIN, 48, { align: 'right', width: CONTENT_W });

    // Status badge
    const statusColor = shipment.status === ShipmentStatus.DELIVERED ? '#16a34a' : '#d97706';
    doc.roundedRect(MARGIN, 85, 110, 20, 4).fill(statusColor);
    doc.fillColor('#fff').fontSize(9).font(FONT.bold)
      .text(shipment.status.toUpperCase(), MARGIN + 4, 91, { width: 102, align: 'center' });

    let y = 118;

    const ensureSpace = (needed: number) => {
      if (y + needed > safeBottom()) { doc.addPage(); y = MARGIN; }
    };

    const sectionHeader = (title: string) => {
      ensureSpace(28);
      doc.fillColor(primary).fontSize(11).font(FONT.bold).text(title, MARGIN, y);
      y += 14;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).strokeColor(accent).lineWidth(1).stroke();
      y += 8;
    };

    // ── From / To ────────────────────────────────────────────────────────────
    ensureSpace(110);
    const colW = (CONTENT_W - 20) / 2;

    // FROM box
    doc.fillColor(primary).fontSize(10).font(FONT.bold).text('FROM', MARGIN, y);
    doc.fillColor(light).rect(MARGIN, y + 14, colW, 85).fill();
    doc.fillColor(primary).fontSize(10).font(FONT.bold).text(shipment.origin_name, MARGIN + 8, y + 20, { width: colW - 16 });
    doc.fillColor('#444').fontSize(9).font(FONT.regular).text(shipment.origin_address, MARGIN + 8, y + 34, { width: colW - 16 });
    let fromY = y + 34 + doc.heightOfString(shipment.origin_address, { width: colW - 16 }) + 4;
    if (shipment.origin_city) { doc.text(shipment.origin_city, MARGIN + 8, fromY, { width: colW - 16 }); fromY += 14; }
    if (shipment.origin_phone) doc.text(`Tel: ${shipment.origin_phone}`, MARGIN + 8, fromY, { width: colW - 16 });

    // TO box
    const col2X = MARGIN + colW + 20;
    doc.fillColor(primary).fontSize(10).font(FONT.bold).text('TO', col2X, y);
    doc.fillColor(light).rect(col2X, y + 14, colW, 85).fill();
    doc.fillColor(primary).fontSize(10).font(FONT.bold).text(shipment.destination_name, col2X + 8, y + 20, { width: colW - 16 });
    doc.fillColor('#444').fontSize(9).font(FONT.regular).text(shipment.destination_address, col2X + 8, y + 34, { width: colW - 16 });
    let toY = y + 34 + doc.heightOfString(shipment.destination_address, { width: colW - 16 }) + 4;
    if (shipment.destination_city) { doc.text(shipment.destination_city, col2X + 8, toY, { width: colW - 16 }); toY += 14; }
    if (shipment.destination_phone) doc.text(`Tel: ${shipment.destination_phone}`, col2X + 8, toY, { width: colW - 16 });

    y += 110;

    // ── Shipment details grid ────────────────────────────────────────────────
    sectionHeader('SHIPMENT DETAILS');
    const details: [string, string][] = [
      ['Priority',      shipment.priority?.toUpperCase() ?? '—'],
      ['Weight',        `${shipment.weight} ${shipment.weight_unit}`],
      ['Packages',      String(shipment.package_count)],
      ['Package Type',  shipment.package_type ?? '—'],
      ['Est. Delivery', shipment.estimated_delivery_date ? new Date(shipment.estimated_delivery_date).toLocaleDateString() : '—'],
      ['Shipping Cost', `${Number(shipment.shipping_cost).toFixed(2)}`],
    ];
    const half = Math.ceil(details.length / 2);
    const startY = y;
    details.forEach(([label, value], i) => {
      const cx = i < half ? MARGIN : MARGIN + CONTENT_W / 2 + 10;
      const cy = startY + (i % half) * 32;
      ensureSpace(32);
      doc.fillColor('#888').fontSize(9).font(FONT.regular).text(label, cx, cy);
      doc.fillColor(primary).fontSize(10).font(FONT.bold).text(value, cx, cy + 12, { width: CONTENT_W / 2 - 20 });
    });
    y = startY + half * 32 + 10;

    // ── Items table ──────────────────────────────────────────────────────────
    sectionHeader('ITEMS');
    ensureSpace(24);
    doc.rect(MARGIN, y, CONTENT_W, 20).fill(primary);
    doc.fillColor('#fff').fontSize(9).font(FONT.bold);
    doc.text('PRODUCT',    MARGIN + 8,  y + 5, { width: 170 });
    doc.text('SKU',        MARGIN + 185, y + 5, { width: 90 });
    doc.text('QTY',        MARGIN + 280, y + 5, { width: 45 });
    doc.text('UNIT PRICE', MARGIN + 330, y + 5, { width: 80 });
    doc.text('TOTAL',      MARGIN + 415, y + 5, { width: 70 });
    y += 22;

    const items = shipment.items ?? [];
    if (items.length === 0) {
      ensureSpace(20);
      doc.fillColor('#888').fontSize(9).font(FONT.regular).text('No items listed', MARGIN + 8, y);
      y += 20;
    } else {
      items.forEach((item, i) => {
        ensureSpace(22);
        if (i % 2 === 0) doc.rect(MARGIN, y - 2, CONTENT_W, 20).fill('#f8fafc');
        doc.fillColor('#333').fontSize(9).font(FONT.regular);
        doc.text(item.product_name ?? '—', MARGIN + 8,  y, { width: 170 });
        doc.text(item.sku ?? '—',          MARGIN + 185, y, { width: 90 });
        doc.text(String(item.quantity),    MARGIN + 280, y, { width: 45 });
        const up = item.unit_price != null ? Number(item.unit_price).toFixed(2) : '—';
        const lt = item.unit_price != null ? (Number(item.unit_price) * Number(item.quantity)).toFixed(2) : '—';
        doc.text(up, MARGIN + 330, y, { width: 80 });
        doc.text(lt, MARGIN + 415, y, { width: 70 });
        y += 20;
      });
    }

    // ── Notes ────────────────────────────────────────────────────────────────
    const noteText = shipment.notes ?? shipment.special_instructions;
    if (noteText) {
      y += 8;
      sectionHeader('NOTES');
      ensureSpace(30);
      doc.fillColor('#555').fontSize(9).font(FONT.regular).text(noteText, MARGIN, y, { width: CONTENT_W });
      y += doc.heightOfString(noteText, { width: CONTENT_W }) + 8;
    }

    this.stampFooters(doc, `Tracking: ${shipment.tracking_number}`);
  }

  // ── Delivery Confirmation ───────────────────────────────────────────────────
  private renderDeliveryConfirmation(doc: PDFKit.PDFDocument, shipment: ShipmentEntity) {
    const primary = '#14532d';
    const accent  = '#16a34a';
    const footerH = 50;
    const safeBottom = () => doc.page.height - footerH - MARGIN;

    // ── Header ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 75).fill(primary);
    doc.fillColor('#fff').fontSize(18).font(FONT.bold)
      .text('DELIVERY CONFIRMATION', MARGIN, 18, { width: CONTENT_W });
    doc.fontSize(9).font(FONT.regular)
      .text(`Tracking: ${shipment.tracking_number}`, MARGIN, 48);
    const deliveredStr = shipment.actual_delivery_date
      ? new Date(shipment.actual_delivery_date).toLocaleString() : '—';
    doc.text(`Delivered: ${deliveredStr}`, MARGIN, 48, { align: 'right', width: CONTENT_W });

    doc.roundedRect(MARGIN, 85, 130, 20, 4).fill(accent);
    doc.fillColor('#fff').fontSize(9).font(FONT.bold)
      .text('✓ DELIVERED', MARGIN + 4, 91, { width: 122, align: 'center' });

    let y = 118;

    const ensureSpace = (needed: number) => {
      if (y + needed > safeBottom()) { doc.addPage(); y = MARGIN; }
    };

    const sectionHeader = (title: string) => {
      ensureSpace(28);
      doc.fillColor(primary).fontSize(11).font(FONT.bold).text(title, MARGIN, y);
      y += 14;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).strokeColor(accent).lineWidth(1).stroke();
      y += 8;
    };

    const row = (label: string, value: string) => {
      const valH = doc.heightOfString(value || '—', { width: CONTENT_W - 155 });
      const rowH = Math.max(22, valH + 6);
      ensureSpace(rowH);
      doc.fillColor('#888').fontSize(9).font(FONT.regular).text(label, MARGIN, y, { width: 145 });
      doc.fillColor(primary).fontSize(10).font(FONT.bold).text(value || '—', MARGIN + 155, y, { width: CONTENT_W - 155 });
      y += rowH;
    };

    // ── Delivery details ─────────────────────────────────────────────────────
    sectionHeader('DELIVERY DETAILS');
    row('Delivered To',    shipment.delivered_to ?? '—');
    row('Delivery Address', shipment.destination_address);
    row('Recipient Name',  shipment.destination_name);
    row('Recipient Phone', shipment.destination_phone ?? '—');
    if (shipment.delivery_notes) row('Delivery Notes', shipment.delivery_notes);

    y += 8;

    // ── Signature ────────────────────────────────────────────────────────────
    sectionHeader('SIGNATURE');
    if (shipment.delivery_signature) {
      ensureSpace(30);
      doc.fillColor('#555').fontSize(10).font(FONT.regular)
        .text(shipment.delivery_signature, MARGIN, y, { width: CONTENT_W });
      y += doc.heightOfString(shipment.delivery_signature, { width: CONTENT_W }) + 8;
    } else {
      ensureSpace(65);
      doc.rect(MARGIN, y, 300, 55).strokeColor('#ccc').lineWidth(0.5).stroke();
      doc.fillColor('#bbb').fontSize(9).font(FONT.regular).text('Signature on file', MARGIN + 8, y + 22);
      y += 65;
    }

    y += 8;

    // ── Items table ──────────────────────────────────────────────────────────
    sectionHeader('DELIVERED ITEMS');
    ensureSpace(24);
    doc.rect(MARGIN, y, CONTENT_W, 20).fill(primary);
    doc.fillColor('#fff').fontSize(9).font(FONT.bold);
    doc.text('PRODUCT', MARGIN + 8,  y + 5, { width: 200 });
    doc.text('SKU',     MARGIN + 215, y + 5, { width: 110 });
    doc.text('QTY',     MARGIN + 330, y + 5, { width: 60 });
    y += 22;

    (shipment.items ?? []).forEach((item, i) => {
      ensureSpace(22);
      if (i % 2 === 0) doc.rect(MARGIN, y - 2, CONTENT_W, 20).fill('#f0fdf4');
      doc.fillColor('#333').fontSize(9).font(FONT.regular);
      doc.text(item.product_name ?? '—', MARGIN + 8,  y, { width: 200 });
      doc.text(item.sku ?? '—',          MARGIN + 215, y, { width: 110 });
      doc.text(String(item.quantity),    MARGIN + 330, y, { width: 60 });
      y += 20;
    });

    this.stampFooters(doc, `Tracking: ${shipment.tracking_number}`);
  }

  /** Stamp footer on every page after rendering is complete */
  private stampFooters(doc: PDFKit.PDFDocument, extra: string) {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const fy = doc.page.height - 45;
      doc.moveTo(MARGIN, fy).lineTo(MARGIN + CONTENT_W, fy).strokeColor('#ddd').lineWidth(0.5).stroke();
      doc.fillColor('#aaa').fontSize(8).font(FONT.regular)
        .text(footerText(extra), MARGIN, fy + 8, { align: 'center', width: CONTENT_W });
    }
  }
}
