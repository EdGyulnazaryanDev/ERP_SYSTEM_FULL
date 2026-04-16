import { Injectable } from '@nestjs/common';
import { DocumentGenerationService } from '../services/document-generation.service';

@Injectable()
export class DocumentTemplatesSeeder {
  private readonly templates = [
    {
      name: 'Employment Contract',
      category: 'employment',
      templateType: 'html' as const,
      templateContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Employment Contract</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .signature { margin-top: 50px; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>EMPLOYMENT CONTRACT</h1>
        <p>Effective Date: {{format_date(contract.effective_date)}}</p>
    </div>

    <div class="section">
        <h2>Parties</h2>
        <div class="field">
            <span class="label">Employer:</span> {{company.name}}
        </div>
        <div class="field">
            <span class="label">Address:</span> {{company.address}}
        </div>
        <div class="field">
            <span class="label">Employee:</span> {{employee.name}}
        </div>
        <div class="field">
            <span class="label">Employee Address:</span> {{employee.address}}
        </div>
    </div>

    <div class="section">
        <h2>Employment Terms</h2>
        <div class="field">
            <span class="label">Position:</span> {{contract.position}}
        </div>
        <div class="field">
            <span class="label">Department:</span> {{contract.department}}
        </div>
        <div class="field">
            <span class="label">Start Date:</span> {{format_date(contract.start_date)}}
        </div>
        <div class="field">
            <span class="label">Employment Type:</span> {{contract.employment_type}}
        </div>
    </div>

    <div class="section">
        <h2>Compensation</h2>
        <div class="field">
            <span class="label">Salary:</span> {{format_currency(compensation.salary)}}/{{compensation.frequency}}
        </div>
        {% if compensation.bonus %}
        <div class="field">
            <span class="label">Bonus:</span> {{format_currency(compensation.bonus)}}
        </div>
        {% endif %}
        <div class="field">
            <span class="label">Benefits:</span> {{compensation.benefits}}
        </div>
    </div>

    <div class="section">
        <h2>Work Schedule</h2>
        <div class="field">
            <span class="label">Work Days:</span> {{schedule.work_days}}
        </div>
        <div class="field">
            <span class="label">Work Hours:</span> {{schedule.work_hours}}
        </div>
        <div class="field">
            <span class="label">Location:</span> {{schedule.location}}
        </div>
    </div>

    <div class="signature">
        <div style="float: left; width: 45%;">
            <p>_________________________</p>
            <p>Employee Signature</p>
            <p>{{employee.name}}</p>
            <p>Date: {{format_date(contract.effective_date)}}</p>
        </div>
        <div style="float: right; width: 45%;">
            <p>_________________________</p>
            <p>Employer Signature</p>
            <p>{{company.name}}</p>
            <p>Date: {{format_date(contract.effective_date)}}</p>
        </div>
        <div style="clear: both;"></div>
    </div>
</body>
</html>`,
      variables: [
        { name: 'company.name', type: 'string', required: true },
        { name: 'company.address', type: 'string', required: true },
        { name: 'employee.name', type: 'string', required: true },
        { name: 'employee.address', type: 'string', required: true },
        { name: 'contract.position', type: 'string', required: true },
        { name: 'contract.department', type: 'string', required: true },
        { name: 'contract.start_date', type: 'date', required: true },
        { name: 'contract.effective_date', type: 'date', required: true },
        { name: 'contract.employment_type', type: 'string', required: true },
        { name: 'compensation.salary', type: 'number', required: true, validation: '{"min": 0}' },
        { name: 'compensation.frequency', type: 'string', required: true },
        { name: 'compensation.bonus', type: 'number', required: false },
        { name: 'compensation.benefits', type: 'string', required: true },
        { name: 'schedule.work_days', type: 'string', required: true },
        { name: 'schedule.work_hours', type: 'string', required: true },
        { name: 'schedule.location', type: 'string', required: true },
      ],
      outputFormats: ['pdf', 'html'],
    },
    {
      name: 'Monthly Payslip',
      category: 'payroll',
      templateType: 'html' as const,
      templateContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payslip</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .section { margin: 20px 0; }
        .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f2f2f2; }
        .total { font-weight: bold; }
        .signature { margin-top: 50px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PAYSLIP</h1>
        <p>Pay Period: {{format_date(payroll.period_start)}} - {{format_date(payroll.period_end)}}</p>
        <p>Payment Date: {{format_date(payroll.payment_date)}}</p>
    </div>

    <div class="section">
        <h2>Employee Information</h2>
        <table class="table">
            <tr><td>Name:</td><td>{{employee.name}}</td></tr>
            <tr><td>Employee ID:</td><td>{{employee.id}}</td></tr>
            <tr><td>Department:</td><td>{{employee.department}}</td></tr>
            <tr><td>Position:</td><td>{{employee.position}}</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>Earnings</h2>
        <table class="table">
            <tr><th>Description</th><th>Hours</th><th>Rate</th><th>Amount</th></tr>
            <tr>
                <td>Basic Salary</td>
                <td>{{earnings.basic_hours}}</td>
                <td>{{format_currency(earnings.basic_rate)}}</td>
                <td>{{format_currency(earnings.basic_amount)}}</td>
            </tr>
            {% if earnings.overtime_hours > 0 %}
            <tr>
                <td>Overtime</td>
                <td>{{earnings.overtime_hours}}</td>
                <td>{{format_currency(earnings.overtime_rate)}}</td>
                <td>{{format_currency(earnings.overtime_amount)}}</td>
            </tr>
            {% endif %}
            {% for allowance in earnings.allowances %}
            <tr>
                <td>{{allowance.name}}</td>
                <td>-</td>
                <td>-</td>
                <td>{{format_currency(allowance.amount)}}</td>
            </tr>
            {% endfor %}
            <tr class="total">
                <td colspan="3">Gross Earnings:</td>
                <td>{{format_currency(computed.gross_earnings)}}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Deductions</h2>
        <table class="table">
            <tr><th>Description</th><th>Amount</th></tr>
            {% for deduction in deductions %}
            <tr>
                <td>{{deduction.name}}</td>
                <td>{{format_currency(deduction.amount)}}</td>
            </tr>
            {% endfor %}
            <tr class="total">
                <td>Total Deductions:</td>
                <td>{{format_currency(computed.total_deductions)}}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Summary</h2>
        <table class="table">
            <tr><td>Gross Earnings:</td><td>{{format_currency(computed.gross_earnings)}}</td></tr>
            <tr><td>Total Deductions:</td><td>{{format_currency(computed.total_deductions)}}</td></tr>
            <tr class="total"><td>Net Pay:</td><td>{{format_currency(computed.net_pay)}}</td></tr>
            <tr><td>YTD Gross:</td><td>{{format_currency(payroll.ytd_gross)}}</td></tr>
            <tr><td>YTD Net:</td><td>{{format_currency(payroll.ytd_net)}}</td></tr>
        </table>
    </div>

    <div class="signature">
        <p>_________________________</p>
        <p>Authorized Signature</p>
        <p>Generated on: {{format_date(generated_at)}}</p>
    </div>
</body>
</html>`,
      variables: [
        { name: 'employee.name', type: 'string', required: true },
        { name: 'employee.id', type: 'string', required: true },
        { name: 'employee.department', type: 'string', required: true },
        { name: 'employee.position', type: 'string', required: true },
        { name: 'payroll.period_start', type: 'date', required: true },
        { name: 'payroll.period_end', type: 'date', required: true },
        { name: 'payroll.payment_date', type: 'date', required: true },
        { name: 'payroll.ytd_gross', type: 'number', required: true },
        { name: 'payroll.ytd_net', type: 'number', required: true },
        { name: 'earnings.basic_hours', type: 'number', required: true },
        { name: 'earnings.basic_rate', type: 'number', required: true },
        { name: 'earnings.basic_amount', type: 'number', required: true },
        { name: 'earnings.overtime_hours', type: 'number', required: false },
        { name: 'earnings.overtime_rate', type: 'number', required: false },
        { name: 'earnings.overtime_amount', type: 'number', required: false },
        { name: 'earnings.allowances', type: 'array', required: false },
        { name: 'deductions', type: 'array', required: true },
        { name: 'computed.gross_earnings', type: 'number', required: true },
        { name: 'computed.total_deductions', type: 'number', required: true },
        { name: 'computed.net_pay', type: 'number', required: true },
        { name: 'generated_at', type: 'date', required: true },
      ],
      outputFormats: ['pdf', 'html'],
    },
    {
      name: 'Commercial Invoice',
      category: 'financial',
      templateType: 'html' as const,
      templateContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Commercial Invoice</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f2f2f2; }
        .total { font-weight: bold; }
        .address { width: 45%; display: inline-block; vertical-align: top; }
        .signature { margin-top: 50px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>COMMERCIAL INVOICE</h1>
        <p>Invoice Number: {{invoice.number}}</p>
        <p>Invoice Date: {{format_date(invoice.date)}}</p>
        <p>Due Date: {{format_date(invoice.due_date)}}</p>
    </div>

    <div class="section">
        <div class="address">
            <h3>Bill To:</h3>
            <p>{{customer.name}}</p>
            <p>{{customer.address}}</p>
            <p>{{customer.city}}, {{customer.country}}</p>
            <p>TAX ID: {{customer.tax_id}}</p>
        </div>
        <div class="address" style="text-align: right;">
            <h3>Bill From:</h3>
            <p>{{company.name}}</p>
            <p>{{company.address}}</p>
            <p>{{company.city}}, {{company.country}}</p>
            <p>TAX ID: {{company.tax_id}}</p>
        </div>
    </div>

    <div class="section">
        <h3>Order Details</h3>
        <table class="table">
            <tr><td>Order Number:</td><td>{{invoice.order_number}}</td></tr>
            <tr><td>Order Date:</td><td>{{format_date(invoice.order_date)}}</td></tr>
            <tr><td>Payment Terms:</td><td>{{invoice.payment_terms}}</td></tr>
            <tr><td>Delivery Method:</td><td>{{invoice.delivery_method}}</td></tr>
        </table>
    </div>

    <div class="section">
        <h3>Line Items</h3>
        <table class="table">
            <tr>
                <th>Item Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
            {% for item in items %}
            <tr>
                <td>{{item.description}}</td>
                <td>{{item.quantity}}</td>
                <td>{{format_currency(item.unit_price)}}</td>
                <td>{{format_currency(item.total)}}</td>
            </tr>
            {% endfor %}
            <tr class="total">
                <td colspan="3">Subtotal:</td>
                <td>{{format_currency(computed.subtotal)}}</td>
            </tr>
            {% if invoice.discount_amount > 0 %}
            <tr>
                <td colspan="3">Discount ({{invoice.discount_percentage}}%):</td>
                <td>-{{format_currency(invoice.discount_amount)}}</td>
            </tr>
            {% endif %}
            <tr>
                <td colspan="3">Tax ({{invoice.tax_rate}}%):</td>
                <td>{{format_currency(computed.tax_amount)}}</td>
            </tr>
            {% if invoice.shipping_cost > 0 %}
            <tr>
                <td colspan="3">Shipping:</td>
                <td>{{format_currency(invoice.shipping_cost)}}</td>
            </tr>
            {% endif %}
            <tr class="total">
                <td colspan="3">Total Amount:</td>
                <td>{{format_currency(computed.total_amount)}}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h3>Payment Instructions</h3>
        <p>Bank: {{payment.bank_name}}</p>
        <p>Account Name: {{payment.account_name}}</p>
        <p>Account Number: {{payment.account_number}}</p>
        <p>SWIFT: {{payment.swift_code}}</p>
    </div>

    <div class="signature">
        <p>_________________________</p>
        <p>Authorized Signature</p>
        <p>{{company.name}}</p>
    </div>
</body>
</html>`,
      variables: [
        { name: 'invoice.number', type: 'string', required: true },
        { name: 'invoice.date', type: 'date', required: true },
        { name: 'invoice.due_date', type: 'date', required: true },
        { name: 'invoice.order_number', type: 'string', required: true },
        { name: 'invoice.order_date', type: 'date', required: true },
        { name: 'invoice.payment_terms', type: 'string', required: true },
        { name: 'invoice.delivery_method', type: 'string', required: true },
        { name: 'invoice.discount_percentage', type: 'number', required: false },
        { name: 'invoice.discount_amount', type: 'number', required: false },
        { name: 'invoice.tax_rate', type: 'number', required: true },
        { name: 'invoice.shipping_cost', type: 'number', required: false },
        { name: 'customer.name', type: 'string', required: true },
        { name: 'customer.address', type: 'string', required: true },
        { name: 'customer.city', type: 'string', required: true },
        { name: 'customer.country', type: 'string', required: true },
        { name: 'customer.tax_id', type: 'string', required: true },
        { name: 'company.name', type: 'string', required: true },
        { name: 'company.address', type: 'string', required: true },
        { name: 'company.city', type: 'string', required: true },
        { name: 'company.country', type: 'string', required: true },
        { name: 'company.tax_id', type: 'string', required: true },
        { name: 'items', type: 'array', required: true },
        { name: 'computed.subtotal', type: 'number', required: true },
        { name: 'computed.tax_amount', type: 'number', required: true },
        { name: 'computed.total_amount', type: 'number', required: true },
        { name: 'payment.bank_name', type: 'string', required: true },
        { name: 'payment.account_name', type: 'string', required: true },
        { name: 'payment.account_number', type: 'string', required: true },
        { name: 'payment.swift_code', type: 'string', required: true },
      ],
      outputFormats: ['pdf', 'html'],
    },
  ];

  constructor(private readonly documentService: DocumentGenerationService) {}

  async seed(): Promise<void> {
    console.log('Seeding document templates...');

    for (const template of this.templates) {
      try {
        // Check if template already exists
        const existing = await this.documentService.getTemplates().then(templates => 
          templates.find(t => t.name === template.name)
        );

        if (!existing) {
          await this.documentService.createTemplate(
            {
              name: template.name,
              category: template.category,
              templateType: template.templateType,
              templateContent: template.templateContent,
              variables: template.variables,
              outputFormats: template.outputFormats,
            },
            null, // Global template (no tenant)
            'system' // Created by system
          );
          console.log(`Created template: ${template.name}`);
        } else {
          console.log(`Template already exists: ${template.name}`);
        }
      } catch (error) {
        console.error(`Error creating template ${template.name}:`, error);
      }
    }

    console.log('Document templates seeding completed.');
  }
}
