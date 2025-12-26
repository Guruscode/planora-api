import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TicketKind, TicketVisibility } from '../../common/enums/ticket-type.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

class TicketDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TicketKind)
  kind: TicketKind;

  @IsBoolean()
  isPaid: boolean;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  groupSize?: number;

  @IsOptional()
  @IsEnum(TicketVisibility)
  visibility?: TicketVisibility;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  perks?: string[];

  @IsOptional()
  @IsDateString()
  salesStart?: Date;

  @IsOptional()
  @IsDateString()
  salesEnd?: Date;

  @IsNumber()
  @Min(1)
  quantityTotal: number;

  @IsUUID()
  eventId: string;
}

@ApiTags('tickets')
@ApiBearerAuth('JWT-auth')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: TicketDto) {
    return this.ticketsService.create(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@CurrentUser('userId') userId: string, @Param('id') id: string, @Body() dto: Partial<TicketDto>) {
    return this.ticketsService.update(userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  list(@CurrentUser('userId') userId: string, @Query('eventId') eventId: string) {
    return this.ticketsService.listForEvent(userId, eventId);
  }

  @Get('public/:eventId')
  listPublic(@Param('eventId') eventId: string) {
    return this.ticketsService.listPublic(eventId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.ticketsService.delete(userId, id);
  }
}
