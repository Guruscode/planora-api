import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  ArrayNotEmpty,
  ValidateIf,
} from 'class-validator';
import { EventType } from '../entities/event.entity';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsDateString()
  startDateTime: string;

  @IsDateString()
  endDateTime: string;

  @IsEnum(EventType)
  type: EventType;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @ValidateIf((o) => o.type === 'physical' || o.type === 'hybrid')
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ValidateIf((o) => o.type === 'physical' || o.type === 'hybrid')
  @IsString()
  @IsNotEmpty()
  locationName?: string;

  @ValidateIf((o) => o.type === 'virtual' || o.type === 'hybrid')
  @IsString()
  @IsNotEmpty()
  virtualUrl?: string;

  @IsOptional()
  @IsString()
  customUrlSlug?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @ArrayNotEmpty()
  tags: string[];

  @IsOptional()
  @IsString()
  timezone?: string = 'Africa/Lagos';
}