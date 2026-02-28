import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ManufacturingService } from './manufacturing.service';
import type {
  CreateBomDto,
  UpdateBomDto,
  ApproveBomDto,
} from './dto/create-bom.dto';
import type {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  RecordProductionDto,
  StartOperationDto,
  CompleteOperationDto,
} from './dto/create-work-order.dto';
import type {
  CreateProductionPlanDto,
  UpdateProductionPlanDto,
  ApproveProductionPlanDto,
} from './dto/create-production-plan.dto';

@Controller('manufacturing')
@UseGuards(JwtAuthGuard)
export class ManufacturingController {
  constructor(private readonly manufacturingService: ManufacturingService) {}

  // ==================== BOM ENDPOINTS ====================

  @Post('boms')
  createBom(
    @Body() data: CreateBomDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.createBom(data, req.user.userId, tenantId);
  }

  @Get('boms')
  getBoms(@CurrentTenant() tenantId: string) {
    return this.manufacturingService.getBoms(tenantId);
  }

  @Get('boms/:id')
  getBom(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.manufacturingService.getBom(id, tenantId);
  }

  @Put('boms/:id')
  updateBom(
    @Param('id') id: string,
    @Body() data: UpdateBomDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.updateBom(id, data, tenantId);
  }

  @Post('boms/:id/approve')
  approveBom(
    @Param('id') id: string,
    @Body() data: ApproveBomDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.approveBom(id, data, tenantId);
  }

  // ==================== WORK ORDER ENDPOINTS ====================

  @Post('work-orders')
  createWorkOrder(
    @Body() data: CreateWorkOrderDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.createWorkOrder(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('work-orders')
  getWorkOrders(@CurrentTenant() tenantId: string) {
    return this.manufacturingService.getWorkOrders(tenantId);
  }

  @Get('work-orders/:id')
  getWorkOrder(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.manufacturingService.getWorkOrder(id, tenantId);
  }

  @Put('work-orders/:id')
  updateWorkOrder(
    @Param('id') id: string,
    @Body() data: UpdateWorkOrderDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.updateWorkOrder(id, data, tenantId);
  }

  @Post('work-orders/:id/release')
  releaseWorkOrder(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.manufacturingService.releaseWorkOrder(id, tenantId);
  }

  @Post('work-orders/:id/start')
  startWorkOrder(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.manufacturingService.startWorkOrder(id, tenantId);
  }

  @Post('work-orders/:id/production')
  recordProduction(
    @Param('id') id: string,
    @Body() data: RecordProductionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.recordProduction(id, data, tenantId);
  }

  @Post('work-orders/:id/complete')
  completeWorkOrder(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.completeWorkOrder(id, tenantId);
  }

  // ==================== OPERATION ENDPOINTS ====================

  @Post('operations/:id/start')
  startOperation(
    @Param('id') id: string,
    @Body() data: StartOperationDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.startOperation(id, data, tenantId);
  }

  @Post('operations/:id/complete')
  completeOperation(
    @Param('id') id: string,
    @Body() data: CompleteOperationDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.completeOperation(id, data, tenantId);
  }

  // ==================== PRODUCTION PLAN ENDPOINTS ====================

  @Post('plans')
  createPlan(
    @Body() data: CreateProductionPlanDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.createPlan(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('plans')
  getPlans(@CurrentTenant() tenantId: string) {
    return this.manufacturingService.getPlans(tenantId);
  }

  @Get('plans/:id')
  getPlan(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.manufacturingService.getPlan(id, tenantId);
  }

  @Put('plans/:id')
  updatePlan(
    @Param('id') id: string,
    @Body() data: UpdateProductionPlanDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.updatePlan(id, data, tenantId);
  }

  @Post('plans/:id/approve')
  approvePlan(
    @Param('id') id: string,
    @Body() data: ApproveProductionPlanDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.manufacturingService.approvePlan(id, data, tenantId);
  }

  // ==================== REPORTING ENDPOINTS ====================

  @Get('reports/summary')
  getProductionSummary(@CurrentTenant() tenantId: string) {
    return this.manufacturingService.getProductionSummary(tenantId);
  }
}
