import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SubscriptionsService } from './subscriptions.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { SetPlanStatusDto } from './dto/set-plan-status.dto';

@Controller('admin/subscription-plans')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class AdminSubscriptionPlansController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  getAllPlans() {
    return this.subscriptionsService.getAllPlansForAdmin();
  }

  @Post()
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Patch(':id')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Delete(':id')
  deletePlan(@Param('id') id: string) {
    return this.subscriptionsService.deletePlan(id);
  }

  @Patch(':id/status')
  setPlanStatus(@Param('id') id: string, @Body() dto: SetPlanStatusDto) {
    return this.subscriptionsService.setPlanStatus(id, dto.isActive);
  }
}
