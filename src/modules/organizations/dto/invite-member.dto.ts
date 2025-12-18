import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrgRole } from '../../../common/enums/org-role.enum';

export class InviteMemberDto {
  @ApiProperty({ example: 'tunde@event.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: OrgRole, example: OrgRole.ADMIN })
  @IsEnum(OrgRole)
  role: OrgRole.ADMIN | OrgRole.MEMBER;
}