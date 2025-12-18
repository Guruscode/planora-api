import { IsEmail, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpByEmailDto {
  @ApiProperty({ example: 'john@planorra.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '483920' })
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}