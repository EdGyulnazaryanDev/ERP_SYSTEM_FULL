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
} from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreatePurchaseRequisitionDto, UpdatePurchaseRequisitionDto, ApproveRequisitionDto, RejectRequisitionDto } from './dto/create-purchase-requisition.dto';
import { CreateRfqDto, UpdateRfqDto } from './dto/create-rfq.dto';
import { CreateVendorQuoteDto, UpdateVendorQuoteDto } from './dto/create-vendor-quote.dto';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, ApprovePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreateGoodsReceiptDto, UpdateGoodsReceiptDto, ApproveGoodsReceiptDto } from './dto/create-goods-receipt.dto';

@UseGuards(JwtAuthGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  // ==================== PURCHASE REQUISITION ENDPOINTS ====================

  @Get('requisitions')
  findAllRequisitions(@CurrentTenant() tenantId: string) {
    return this.procurementService.findAllRequisitions(tenantId);
  }

  /**
   * Approval queue — returns all requisitions and POs pending approval.
   * Intended for managers/CEO role. Role enforcement is handled by the
   * permission guard on the frontend and can be extended with @RequirePermission.
   */
  @Get('pending-approvals')
  findPendingApprovals(@CurrentTenant() tenantId: string) {
    return this.procurementService.findPendingApprovals(tenantId);
  }

  @Get('requisitions/:id')
  findOneRequisition(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.procurementService.findOneRequisition(id, tenantId);
  }

  @Post('requisitions')
  createRequisition(
    @Body() createRequisitionDto: CreatePurchaseRequisitionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.createRequisition(createRequisitionDto, tenantId);
  }

  @Put('requisitions/:id')
  updateRequisition(
    @Param('id') id: string,
    @Body() updateRequisitionDto: UpdatePurchaseRequisitionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.updateRequisition(id, updateRequisitionDto, tenantId);
  }

  @Delete('requisitions/:id')
  async deleteRequisition(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.procurementService.deleteRequisition(id, tenantId);
    return { message: 'Requisition deleted successfully' };
  }

  @Post('requisitions/:id/approve')
  approveRequisition(
    @Param('id') id: string,
    @Body() approveDto: ApproveRequisitionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.approveRequisition(id, approveDto, tenantId);
  }

  @Post('requisitions/:id/reject')
  rejectRequisition(
    @Param('id') id: string,
    @Body() rejectDto: RejectRequisitionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.rejectRequisition(id, rejectDto, tenantId);
  }

  // ==================== RFQ ENDPOINTS ====================

  @Get('rfqs')
  findAllRfqs(@CurrentTenant() tenantId: string) {
    return this.procurementService.findAllRfqs(tenantId);
  }

  @Get('rfqs/:id')
  findOneRfq(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.procurementService.findOneRfq(id, tenantId);
  }

  @Post('rfqs')
  createRfq(@Body() createRfqDto: CreateRfqDto, @CurrentTenant() tenantId: string) {
    return this.procurementService.createRfq(createRfqDto, tenantId);
  }

  @Put('rfqs/:id')
  updateRfq(
    @Param('id') id: string,
    @Body() updateRfqDto: UpdateRfqDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.updateRfq(id, updateRfqDto, tenantId);
  }

  @Delete('rfqs/:id')
  async deleteRfq(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.procurementService.deleteRfq(id, tenantId);
    return { message: 'RFQ deleted successfully' };
  }

  // ==================== VENDOR QUOTE ENDPOINTS ====================

  @Get('vendor-quotes')
  findAllVendorQuotes(
    @Query('rfqId') rfqId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.findAllVendorQuotes(tenantId, rfqId);
  }

  @Get('vendor-quotes/:id')
  findOneVendorQuote(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.procurementService.findOneVendorQuote(id, tenantId);
  }

  @Post('vendor-quotes')
  createVendorQuote(
    @Body() createVendorQuoteDto: CreateVendorQuoteDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.createVendorQuote(createVendorQuoteDto, tenantId);
  }

  @Put('vendor-quotes/:id')
  updateVendorQuote(
    @Param('id') id: string,
    @Body() updateVendorQuoteDto: UpdateVendorQuoteDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.updateVendorQuote(id, updateVendorQuoteDto, tenantId);
  }

  @Delete('vendor-quotes/:id')
  async deleteVendorQuote(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.procurementService.deleteVendorQuote(id, tenantId);
    return { message: 'Vendor quote deleted successfully' };
  }

  // ==================== PURCHASE ORDER ENDPOINTS ====================

  @Get('purchase-orders')
  findAllPurchaseOrders(@CurrentTenant() tenantId: string) {
    return this.procurementService.findAllPurchaseOrders(tenantId);
  }

  @Get('purchase-orders/:id')
  findOnePurchaseOrder(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.procurementService.findOnePurchaseOrder(id, tenantId);
  }

  @Post('purchase-orders')
  createPurchaseOrder(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.createPurchaseOrder(createPurchaseOrderDto, tenantId);
  }

  @Put('purchase-orders/:id')
  updatePurchaseOrder(
    @Param('id') id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.updatePurchaseOrder(id, updatePurchaseOrderDto, tenantId);
  }

  @Delete('purchase-orders/:id')
  async deletePurchaseOrder(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.procurementService.deletePurchaseOrder(id, tenantId);
    return { message: 'Purchase order deleted successfully' };
  }

  @Post('purchase-orders/:id/approve')
  approvePurchaseOrder(
    @Param('id') id: string,
    @Body() approveDto: ApprovePurchaseOrderDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.approvePurchaseOrder(id, approveDto, tenantId);
  }

  // ==================== GOODS RECEIPT ENDPOINTS ====================

  @Get('goods-receipts')
  findAllGoodsReceipts(@CurrentTenant() tenantId: string) {
    return this.procurementService.findAllGoodsReceipts(tenantId);
  }

  @Get('goods-receipts/:id')
  findOneGoodsReceipt(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.procurementService.findOneGoodsReceipt(id, tenantId);
  }

  @Post('goods-receipts')
  createGoodsReceipt(
    @Body() createGoodsReceiptDto: CreateGoodsReceiptDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.createGoodsReceipt(createGoodsReceiptDto, tenantId);
  }

  @Put('goods-receipts/:id')
  updateGoodsReceipt(
    @Param('id') id: string,
    @Body() updateGoodsReceiptDto: UpdateGoodsReceiptDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.updateGoodsReceipt(id, updateGoodsReceiptDto, tenantId);
  }

  @Delete('goods-receipts/:id')
  async deleteGoodsReceipt(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.procurementService.deleteGoodsReceipt(id, tenantId);
    return { message: 'Goods receipt deleted successfully' };
  }

  @Post('goods-receipts/:id/approve')
  approveGoodsReceipt(
    @Param('id') id: string,
    @Body() approveDto: ApproveGoodsReceiptDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.procurementService.approveGoodsReceipt(id, approveDto, tenantId);
  }
}
