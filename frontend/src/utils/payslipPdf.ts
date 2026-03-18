import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

function buildPayslipDoc(doc: jsPDF, payslip: any, startY: number): number {
  const empName = payslip.employee
    ? `${payslip.employee.first_name} ${payslip.employee.last_name}`
    : 'N/A';
  const period = `${dayjs().month(payslip.month - 1).format('MMMM')} ${payslip.year}`;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 105, startY, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payslip #: ${payslip.payslip_number}`, 14, startY + 10);
  doc.text(`Employee: ${empName}`, 14, startY + 17);
  doc.text(`Period: ${period}`, 14, startY + 24);
  doc.text(`Status: ${payslip.status}`, 14, startY + 31);

  const rows = [
    ['Working Days', String(payslip.working_days ?? '-')],
    ['Present Days', String(payslip.present_days ?? '-')],
    ['Gross Salary', `$${Number(payslip.gross_salary || 0).toFixed(2)}`],
    ['Total Deductions', `-$${Number(payslip.total_deductions || 0).toFixed(2)}`],
    ['Net Salary', `$${Number(payslip.net_salary || 0).toFixed(2)}`],
  ];

  autoTable(doc, {
    startY: startY + 38,
    head: [['Description', 'Amount']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [24, 144, 255] },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

export function downloadPayslipPdf(payslip: any): void {
  const doc = new jsPDF();
  buildPayslipDoc(doc, payslip, 20);
  const empName = payslip.employee
    ? `${payslip.employee.first_name}_${payslip.employee.last_name}`
    : 'employee';
  doc.save(`payslip_${empName}_${payslip.month}_${payslip.year}.pdf`);
}

export function downloadAllPayslipsPdf(payslips: any[], month: number, year: number): void {
  const doc = new jsPDF();
  const monthName = dayjs().month(month - 1).format('MMMM');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Payroll Report — ${monthName} ${year}`, 105, 14, { align: 'center' });

  // Summary table
  const summaryRows = payslips.map((p: any) => [
    p.payslip_number,
    p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : '-',
    `$${Number(p.gross_salary || 0).toFixed(2)}`,
    `-$${Number(p.total_deductions || 0).toFixed(2)}`,
    `$${Number(p.net_salary || 0).toFixed(2)}`,
    p.status,
  ]);

  autoTable(doc, {
    startY: 22,
    head: [['Payslip #', 'Employee', 'Gross', 'Deductions', 'Net', 'Status']],
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillColor: [24, 144, 255] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  // Individual payslips on new pages
  payslips.forEach((payslip: any) => {
    doc.addPage();
    buildPayslipDoc(doc, payslip, 20);
  });

  doc.save(`payroll_${monthName}_${year}.pdf`);
}
