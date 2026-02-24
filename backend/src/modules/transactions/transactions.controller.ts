import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { TransactionsService } from './transactions.service';
import { PdfService } from './pdf.service';
import { ExcelService } from './excel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly pdfService: PdfService,
    private readonly excelService: ExcelService,
  ) {}

  @Post()
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.transactionsService.create(createTransactionDto, tenantId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateTransactionDto: CreateTransactionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.transactionsService.update(id, updateTransactionDto, tenantId);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: any,
    @Query('status') status?: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionsService.findAll(tenantId, {
      type,
      status,
      startDate,
      endDate,
    });
  }

  @Get('analytics')
  getAnalytics(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.transactionsService.getAnalytics(tenantId, startDate, endDate);
  }

  @Get('export')
  async exportTransactions(
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
    @Query('type') type?: any,
    @Query('status') status?: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const transactions = await this.transactionsService.findAll(tenantId, {
      type,
      status,
      startDate,
      endDate,
    });

    const buffer = await this.excelService.exportTransactions(transactions);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=transactions.xlsx',
    );

    res.send(buffer);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importTransactions(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file: any,
  ) {
    const transactions = await this.excelService.importTransactions(
      file.buffer,
    );

    const results: Array<{
      success: boolean;
      transaction?: any;
      error?: string;
      data?: any;
    }> = [];

    for (const data of transactions) {
      try {
        const transaction = await this.transactionsService.create(
          data as CreateTransactionDto,
          tenantId,
        );
        results.push({ success: true, transaction });
      } catch (error: any) {
        results.push({ success: false, error: error.message, data });
      }
    }

    return {
      total: transactions.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.transactionsService.findOne(id, tenantId);
  }

  @Get(':id/pdf')
  async generatePdf(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ) {
    const transaction = await this.transactionsService.findOne(id, tenantId);
    const pdfBuffer = await this.pdfService.generateInvoice(transaction);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${transaction.transaction_number}.pdf`,
    );

    res.send(pdfBuffer);
  }

  @Get(':id/export')
  async exportTransaction(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ) {
    const transaction = await this.transactionsService.findOne(id, tenantId);
    const buffer =
      await this.excelService.exportTransactionDetails(transaction);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transaction-${transaction.transaction_number}.xlsx`,
    );

    res.send(buffer);
  }

  @Put(':id/complete')
  complete(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.transactionsService.complete(id, tenantId);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.transactionsService.cancel(id, tenantId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.transactionsService.delete(id, tenantId);
    return { message: 'Transaction deleted successfully' };
  }
}
