import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BillOfMaterialsEntity,
  BomStatus,
} from './entities/bill-of-materials.entity';
import { BomComponentEntity } from './entities/bom-component.entity';
import {
  WorkOrderEntity,
  WorkOrderStatus,
} from './entities/work-order.entity';
import {
  WorkOrderOperationEntity,
  OperationStatus,
} from './entities/work-order-operation.entity';
import {
  ProductionPlanEntity,
  PlanStatus,
} from './entities/production-plan.entity';
import { ProductionScheduleEntity } from './entities/production-schedule.entity';
import { QualityCheckEntity } from './entities/quality-check.entity';
import { WorkstationEntity } from './entities/workstation.entity';
import { ProductionBatchEntity } from './entities/production-batch.entity';
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

@Injectable()
export class ManufacturingService {
  constructor(
    @InjectRepository(BillOfMaterialsEntity)
    private bomRepo: Repository<BillOfMaterialsEntity>,
    @InjectRepository(BomComponentEntity)
    private bomComponentRepo: Repository<BomComponentEntity>,
    @InjectRepository(WorkOrderEntity)
    private workOrderRepo: Repository<WorkOrderEntity>,
    @InjectRepository(WorkOrderOperationEntity)
    private operationRepo: Repository<WorkOrderOperationEntity>,
    @InjectRepository(ProductionPlanEntity)
    private planRepo: Repository<ProductionPlanEntity>,
    @InjectRepository(ProductionScheduleEntity)
    private scheduleRepo: Repository<ProductionScheduleEntity>,
    @InjectRepository(QualityCheckEntity)
    private qualityCheckRepo: Repository<QualityCheckEntity>,
    @InjectRepository(WorkstationEntity)
    private workstationRepo: Repository<WorkstationEntity>,
    @InjectRepository(ProductionBatchEntity)
    private batchRepo: Repository<ProductionBatchEntity>,
  ) {}

  // ==================== BOM METHODS ====================

  async createBom(
    data: CreateBomDto,
    userId: string,
    tenantId: string,
  ): Promise<BillOfMaterialsEntity> {
    const count = await this.bomRepo.count({ where: { tenant_id: tenantId } });
    const bomNumber = `BOM-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    let totalCost = 0;
    data.components.forEach((comp) => {
      const componentCost =
        Number(comp.quantity) * Number(comp.unit_cost || 0);
      totalCost += componentCost;
    });

    const bom = this.bomRepo.create({
      ...data,
      bom_number: bomNumber,
      total_cost: totalCost,
      created_by: userId,
      tenant_id: tenantId,
    });

    const savedBom = await this.bomRepo.save(bom);

    for (const compData of data.components) {
      const component = this.bomComponentRepo.create({
        ...compData,
        bom_id: savedBom.id,
        total_cost: Number(compData.quantity) * Number(compData.unit_cost || 0),
        tenant_id: tenantId,
      });
      await this.bomComponentRepo.save(component);
    }

    return this.getBom(savedBom.id, tenantId);
  }

  async getBoms(tenantId: string): Promise<BillOfMaterialsEntity[]> {
    return this.bomRepo.find({
      where: { tenant_id: tenantId },
      relations: ['components'],
      order: { created_at: 'DESC' },
    });
  }

  async getBom(
    id: string,
    tenantId: string,
  ): Promise<BillOfMaterialsEntity> {
    const bom = await this.bomRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['components'],
    });

    if (!bom) {
      throw new NotFoundException('BOM not found');
    }

    return bom;
  }

  async updateBom(
    id: string,
    data: UpdateBomDto,
    tenantId: string,
  ): Promise<BillOfMaterialsEntity> {
    const bom = await this.getBom(id, tenantId);

    if (bom.status === BomStatus.ACTIVE) {
      throw new BadRequestException('Cannot update active BOM');
    }

    Object.assign(bom, data);
    return this.bomRepo.save(bom);
  }

  async approveBom(
    id: string,
    data: ApproveBomDto,
    tenantId: string,
  ): Promise<BillOfMaterialsEntity> {
    const bom = await this.getBom(id, tenantId);

    if (bom.status !== BomStatus.DRAFT) {
      throw new BadRequestException('Only draft BOMs can be approved');
    }

    bom.status = BomStatus.ACTIVE;
    bom.approved_by = data.approved_by;
    bom.approved_at = new Date();

    return this.bomRepo.save(bom);
  }

  // ==================== WORK ORDER METHODS ====================

  async createWorkOrder(
    data: CreateWorkOrderDto,
    userId: string,
    tenantId: string,
  ): Promise<WorkOrderEntity> {
    const count = await this.workOrderRepo.count({
      where: { tenant_id: tenantId },
    });
    const woNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const workOrder = this.workOrderRepo.create({
      ...data,
      work_order_number: woNumber,
      created_by: userId,
      tenant_id: tenantId,
    });

    const savedWo = await this.workOrderRepo.save(workOrder);

    if (data.operations && data.operations.length > 0) {
      for (const opData of data.operations) {
        const operation = this.operationRepo.create({
          ...opData,
          work_order_id: savedWo.id,
          tenant_id: tenantId,
        });
        await this.operationRepo.save(operation);
      }
    }

    return this.getWorkOrder(savedWo.id, tenantId);
  }

  async getWorkOrders(tenantId: string): Promise<WorkOrderEntity[]> {
    return this.workOrderRepo.find({
      where: { tenant_id: tenantId },
      relations: ['operations'],
      order: { created_at: 'DESC' },
    });
  }

  async getWorkOrder(
    id: string,
    tenantId: string,
  ): Promise<WorkOrderEntity> {
    const wo = await this.workOrderRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['operations'],
    });

    if (!wo) {
      throw new NotFoundException('Work order not found');
    }

    return wo;
  }

  async updateWorkOrder(
    id: string,
    data: UpdateWorkOrderDto,
    tenantId: string,
  ): Promise<WorkOrderEntity> {
    const wo = await this.getWorkOrder(id, tenantId);
    Object.assign(wo, data);
    return this.workOrderRepo.save(wo);
  }

  async releaseWorkOrder(
    id: string,
    tenantId: string,
  ): Promise<WorkOrderEntity> {
    const wo = await this.getWorkOrder(id, tenantId);

    if (wo.status !== WorkOrderStatus.PLANNED) {
      throw new BadRequestException('Only planned work orders can be released');
    }

    wo.status = WorkOrderStatus.RELEASED;
    return this.workOrderRepo.save(wo);
  }

  async startWorkOrder(
    id: string,
    tenantId: string,
  ): Promise<WorkOrderEntity> {
    const wo = await this.getWorkOrder(id, tenantId);

    if (wo.status !== WorkOrderStatus.RELEASED) {
      throw new BadRequestException('Only released work orders can be started');
    }

    wo.status = WorkOrderStatus.IN_PROGRESS;
    wo.actual_start_date = new Date();
    return this.workOrderRepo.save(wo);
  }

  async recordProduction(
    id: string,
    data: RecordProductionDto,
    tenantId: string,
  ): Promise<WorkOrderEntity> {
    const wo = await this.getWorkOrder(id, tenantId);

    wo.quantity_produced =
      Number(wo.quantity_produced) + Number(data.quantity_produced);
    wo.quantity_scrapped =
      Number(wo.quantity_scrapped) + Number(data.quantity_scrapped || 0);

    if (wo.quantity_produced >= wo.quantity_planned) {
      wo.status = WorkOrderStatus.COMPLETED;
      wo.actual_end_date = new Date();
    }

    if (data.notes) {
      wo.notes = wo.notes ? `${wo.notes}\n${data.notes}` : data.notes;
    }

    return this.workOrderRepo.save(wo);
  }

  async completeWorkOrder(
    id: string,
    tenantId: string,
  ): Promise<WorkOrderEntity> {
    const wo = await this.getWorkOrder(id, tenantId);

    wo.status = WorkOrderStatus.COMPLETED;
    wo.actual_end_date = new Date();

    return this.workOrderRepo.save(wo);
  }

  // ==================== OPERATION METHODS ====================

  async startOperation(
    operationId: string,
    data: StartOperationDto,
    tenantId: string,
  ): Promise<WorkOrderOperationEntity> {
    const operation = await this.operationRepo.findOne({
      where: { id: operationId, tenant_id: tenantId },
    });

    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    operation.status = OperationStatus.IN_PROGRESS;
    operation.start_time = new Date();
    operation.operator_id = data.operator_id;

    return this.operationRepo.save(operation);
  }

  async completeOperation(
    operationId: string,
    data: CompleteOperationDto,
    tenantId: string,
  ): Promise<WorkOrderOperationEntity> {
    const operation = await this.operationRepo.findOne({
      where: { id: operationId, tenant_id: tenantId },
    });

    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    operation.status = OperationStatus.COMPLETED;
    operation.end_time = new Date();
    operation.actual_time_hours = data.actual_time_hours;

    if (data.notes) {
      operation.notes = data.notes;
    }

    return this.operationRepo.save(operation);
  }

  // ==================== PRODUCTION PLAN METHODS ====================

  async createPlan(
    data: CreateProductionPlanDto,
    userId: string,
    tenantId: string,
  ): Promise<ProductionPlanEntity> {
    const count = await this.planRepo.count({ where: { tenant_id: tenantId } });
    const planNumber = `PLAN-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const plan = this.planRepo.create({
      ...data,
      plan_number: planNumber,
      created_by: userId,
      tenant_id: tenantId,
    });

    return this.planRepo.save(plan);
  }

  async getPlans(tenantId: string): Promise<ProductionPlanEntity[]> {
    return this.planRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async getPlan(
    id: string,
    tenantId: string,
  ): Promise<ProductionPlanEntity> {
    const plan = await this.planRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!plan) {
      throw new NotFoundException('Production plan not found');
    }

    return plan;
  }

  async updatePlan(
    id: string,
    data: UpdateProductionPlanDto,
    tenantId: string,
  ): Promise<ProductionPlanEntity> {
    const plan = await this.getPlan(id, tenantId);
    Object.assign(plan, data);
    return this.planRepo.save(plan);
  }

  async approvePlan(
    id: string,
    data: ApproveProductionPlanDto,
    tenantId: string,
  ): Promise<ProductionPlanEntity> {
    const plan = await this.getPlan(id, tenantId);

    if (plan.status !== PlanStatus.DRAFT) {
      throw new BadRequestException('Only draft plans can be approved');
    }

    plan.status = PlanStatus.APPROVED;
    plan.approved_by = data.approved_by;
    plan.approved_at = new Date();

    return this.planRepo.save(plan);
  }

  // ==================== REPORTING METHODS ====================

  async getProductionSummary(tenantId: string): Promise<any> {
    const workOrders = await this.getWorkOrders(tenantId);

    const summary = {
      total_work_orders: workOrders.length,
      in_progress: workOrders.filter(
        (wo) => wo.status === WorkOrderStatus.IN_PROGRESS,
      ).length,
      completed: workOrders.filter(
        (wo) => wo.status === WorkOrderStatus.COMPLETED,
      ).length,
      total_quantity_planned: workOrders.reduce(
        (sum, wo) => sum + Number(wo.quantity_planned),
        0,
      ),
      total_quantity_produced: workOrders.reduce(
        (sum, wo) => sum + Number(wo.quantity_produced),
        0,
      ),
      total_cost: workOrders.reduce(
        (sum, wo) => sum + Number(wo.total_cost),
        0,
      ),
    };

    return summary;
  }
}
