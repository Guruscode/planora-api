// src/modules/events/events.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity'; // adjust path
import { Event } from '../events/entities/event.entity';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('events')
@ApiBearerAuth('JWT-auth')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // === ORGANIZER ENDPOINTS (authenticated) ===

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateEventDto,
    @Req() req: any, // or use a custom decorator for organizationId
  ): Promise<Event> {
    // Assuming frontend sends organizationId or user has a current/active organization
    // You can create @CurrentOrganization() decorator if needed
    const organizationId = req.body.organizationId || req.query?.orgId;

    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    return this.eventsService.create(user.id, organizationId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyEvents(@CurrentUser() user: User, @Query('orgId') organizationId: string) {
    return this.eventsService.findAllByOrganization(user.id, organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/drafts')
  async getDrafts(@CurrentUser() user: User, @Query('orgId') organizationId: string) {
    return this.eventsService.findDrafts(user.id, organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/:id')
  async getMyEvent(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('orgId') organizationId: string,
  ) {
    return this.eventsService.findOne(id, user.id, organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('orgId') organizationId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, user.id, organizationId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/submit')
  async submitForApproval(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('orgId') organizationId: string,
  ) {
    return this.eventsService.submitForApproval(id, user.id, organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('orgId') organizationId: string,
  ) {
    return this.eventsService.delete(id, user.id, organizationId);
  }

  // === ADMIN ===
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.eventsService.approve(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.eventsService.reject(id, reason);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/analytics/summary')
  analytics() {
    return this.eventsService.analyticsSummary();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/metrics')
  metrics(@Param('id') id: string) {
    return this.eventsService.eventMetrics(id);
  }

  // === PUBLIC ENDPOINTS (no auth) ===

  @Get('feed')
  async getPublicFeed(
    @Query('country') country?: string,
    @Query('state') state?: string,
    @Query('tags') tags?: string, // comma-separated
    @Query('upcoming') upcoming = 'true',
  ) {
    const tagArray = tags ? tags.split(',') : undefined;
    return this.eventsService.getPublicFeed({
      country,
      state,
      tags: tagArray,
      upcoming: upcoming === 'true',
    });
  }

  @Get('recommended')
  async recommended(@Query('limit') limit = '5') {
    return this.eventsService.getRecommended(parseInt(limit, 10) || 5);
  }

  @Get('public/:id')
  async getPublicEvent(@Param('id') id: string) {
    return this.eventsService.getPublicEventById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('save/:id')
  async saveEvent(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.eventsService.saveEvent(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('unsave/:id')
  async unsaveEvent(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.eventsService.unsaveEvent(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('saved/my')
  async mySaved(@CurrentUser('userId') userId: string) {
    return this.eventsService.listSaved(userId);
  }
}
