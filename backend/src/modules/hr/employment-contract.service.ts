/* eslint-disable prettier/prettier */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { EmployeeEntity } from './entities/employee.entity';
import { registerFonts, FONT, PAGE_W, MARGIN, CONTENT_W, footerText } from '../../common/pdf/pdf-utils';

@Injectable()
export class EmploymentContractService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private employeeRepo: Repository<EmployeeEntity>,
  ) {}

  async generateContractPdf(employee: EmployeeEntity): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: true, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      registerFonts(doc);
      this.render(doc, employee);
      doc.end();
    });
  }

  async signContract(employeeId: string, tenantId: string, signature: string): Promise<EmployeeEntity> {
    const employee = await this.employeeRepo.findOne({ where: { id: employeeId, tenant_id: tenantId } });
    if (!employee) throw new BadRequestException('Employee not found');
    if (employee.contract_status === 'signed') throw new BadRequestException('Contract already signed');
    employee.contract_signature = signature;
    employee.contract_signed_at = new Date();
    employee.contract_status = 'signed';
    return this.employeeRepo.save(employee);
  }

  private render(doc: PDFKit.PDFDocument, emp: EmployeeEntity) {
    const primary = '#1a3a5c';
    const accent = '#0ea5e9';
    const pageH = doc.page.height;
    const footerH = 50;
    const safeBottom = pageH - footerH - MARGIN;

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 75).fill(primary);
    doc.fillColor('#fff').fontSize(18).font(FONT.bold)
      .text('EMPLOYMENT CONTRACT / OFFER LETTER', MARGIN, 20, { width: CONTENT_W });
    doc.fontSize(9).font(FONT.regular)
      .text(`Date: ${new Date().toLocaleDateString()}`, MARGIN, 52, { width: CONTENT_W });

    // Status badge
    const badgeColor = emp.contract_status === 'signed' ? '#16a34a' : '#d97706';
    doc.roundedRect(MARGIN, 85, 100, 20, 4).fill(badgeColor);
    doc.fillColor('#fff').fontSize(9).font(FONT.bold)
      .text(String(emp.contract_status ?? 'pending').toUpperCase(), MARGIN + 4, 91, { width: 92, align: 'center' });

    let y = 118;

    const ensureSpace = (needed: number) => {
      if (y + needed > safeBottom) {
        doc.addPage();
        y = MARGIN;
      }
    };

    const sectionHeader = (title: string) => {
      ensureSpace(30);
      doc.fillColor(primary).fontSize(11).font(FONT.bold).text(title, MARGIN, y);
      y += 14;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).strokeColor(accent).lineWidth(1).stroke();
      y += 8;
    };

    const row = (label: string, value: string) => {
      ensureSpace(22);
      doc.fillColor('#888').fontSize(9).font(FONT.regular).text(label, MARGIN, y, { width: 160 });
      doc.fillColor(primary).fontSize(10).font(FONT.bold).text(value || '—', MARGIN + 165, y, { width: CONTENT_W - 165 });
      y += 22;
    };
    // ── Employee details ─────────────────────────────────────────────────────
    sectionHeader('EMPLOYEE DETAILS');
    row('Full Name', `${emp.first_name} ${emp.last_name}`);
    row('Employee Code', emp.employee_code);
    row('Email', emp.email);
    row('Department', emp.department);
    row('Position / Job Title', emp.position);
    row('Employment Type', (emp.employment_type ?? '').replace('_', ' ').toUpperCase());
    row('Start Date', emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : '—');
    row('Base Salary', emp.salary ? `${Number(emp.salary).toFixed(2)} / month` : '—');

    y += 10;

    // ── Terms ────────────────────────────────────────────────────────────────
    sectionHeader('TERMS & CONDITIONS');
    const terms = [
      '1. The employee agrees to perform duties as assigned by the company in the role stated above.',
      '2. Compensation will be paid monthly as per the salary stated, subject to applicable taxes.',
      '3. Either party may terminate this agreement with 30 days written notice.',
      '4. The employee agrees to maintain confidentiality of all proprietary company information.',
      '5. This contract is governed by applicable employment law.',
    ];
    terms.forEach((term) => {
      ensureSpace(24);
      doc.fillColor('#444').fontSize(10).font(FONT.regular).text(term, MARGIN, y, { width: CONTENT_W });
      y += 22;
    });

    y += 10;

    // ── Signature ────────────────────────────────────────────────────────────
    sectionHeader('SIGNATURE');
    if (emp.contract_status === 'signed' && emp.contract_signature) {
      ensureSpace(60);
      doc.fillColor('#16a34a').fontSize(10).font(FONT.bold).text('✓ Digitally signed by employee', MARGIN, y);
      y += 16;
      doc.fillColor('#555').fontSize(10).font(FONT.regular).text(`Signature: ${emp.contract_signature}`, MARGIN, y);
      y += 16;
      doc.fillColor('#888').fontSize(9).font(FONT.regular)
        .text(`Signed on: ${emp.contract_signed_at ? new Date(emp.contract_signed_at as Date).toLocaleString() : '—'}`, MARGIN, y);
      y += 20;
    } else {
      ensureSpace(70);
      doc.rect(MARGIN, y, 300, 55).strokeColor('#ccc').lineWidth(0.5).stroke();
      doc.fillColor('#bbb').fontSize(9).font(FONT.regular).text('Employee signature (pending)', MARGIN + 8, y + 22);
      y += 65;
    }

    // ── Footer on every page ─────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const fy = doc.page.height - footerH;
      doc.moveTo(MARGIN, fy).lineTo(MARGIN + CONTENT_W, fy).strokeColor('#ddd').lineWidth(0.5).stroke();
      doc.fillColor('#aaa').fontSize(8).font(FONT.regular)
        .text(footerText(`${emp.first_name} ${emp.last_name} · ${emp.employee_code}`), MARGIN, fy + 8, { align: 'center', width: CONTENT_W });
    }
  }
}
