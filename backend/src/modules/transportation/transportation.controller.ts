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
import { TransportationService } from './transportation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipmentStatus } from './entities/shipment.entity';
import { RouteStatus } from './entities/delivery-route.entity';
import type { CourierEntity } from './entities/courier.entity';

@UseGuards(JwtAuthGuard)
@Controller('transportation')
export class TransportationController {
  constructor(
    private readonly transportationService: TransportationService,
  ) {}

  // Shipments
  @Get('shipments')
  findAllShipments(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: ShipmentStatus,
    @Query('courier_id') courierId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transportationService.findAllShipments(tenantId, {
      status,
      courier_id: courierId,
      startDate,
      endDate,
    });
  }

  @Get('shipments/pending-count')
  getPendingShipmentsCount(@CurrentTenant() tenantId: string) {
    return this.transportationService.getPendingShipmentsCount(tenantId);
  }

  @Get('shipments/track/:trackingNumber')
  trackShipment(@Param('trackingNumber') trackingNumber: string) {
    return this.transportationService.findShipmentByTracking(trackingNumber);
  }

  @Get('shipments/analytics')
  getShipmentAnalytics(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.transportationService.getShipmentAnalytics(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('shipments/:id')
  findOneShipment(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.transportationService.findOneShipment(id, tenantId);
  }

  @Post('shipments')
  createShipment(
    @Body() createShipmentDto: CreateShipmentDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.transportationService.createShipment(
      createShipmentDto,
      tenantId,
    );
  }

  @Put('shipments/:id/status')
  updateShipmentStatus(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      status: ShipmentStatus;
      notes?: string;
      location?: string;
    },
  ) {
    return this.transportationService.updateShipmentStatus(
      id,
      body.status,
      tenantId,
      body.notes,
      body.location,
    );
  }

  @Post('shipments/:id/proof-of-delivery')
  addProofOfDelivery(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      delivered_to: string;
      signature?: string;
      photos?: string[];
      notes?: string;
    },
  ) {
    return this.transportationService.addProofOfDelivery(id, tenantId, body);
  }

  // Couriers
  @Get('couriers')
  findAllCouriers(@CurrentTenant() tenantId: string) {
    return this.transportationService.findAllCouriers(tenantId);
  }

  @Get('couriers/:id')
  findOneCourier(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.transportationService.findOneCourier(id, tenantId);
  }

  @Post('couriers')
  createCourier(
    @Body() data: Partial<CourierEntity>,
    @CurrentTenant() tenantId: string,
  ) {
    return this.transportationService.createCourier(data, tenantId);
  }

  @Put('couriers/:id')
  updateCourier(
    @Param('id') id: string,
    @Body() data: Partial<CourierEntity>,
    @CurrentTenant() tenantId: string,
  ) {
    return this.transportationService.updateCourier(id, data, tenantId);
  }

  @Delete('couriers/:id')
  async deleteCourier(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.transportationService.deleteCourier(id, tenantId);
    return { message: 'Courier deleted successfully' };
  }

  // Routes
  @Post('routes')
  createRoute(
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      courier_id: string;
      shipment_ids: string[];
      route_date: string;
    },
  ) {
    return this.transportationService.createRoute(
      tenantId,
      body.courier_id,
      body.shipment_ids,
      new Date(body.route_date),
    );
  }

  @Put('routes/:id/status')
  updateRouteStatus(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() body: { status: RouteStatus },
  ) {
    return this.transportationService.updateRouteStatus(
      id,
      body.status,
      tenantId,
    );
  }
}
