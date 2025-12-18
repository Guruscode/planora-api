
import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('organizations')
@ApiBearerAuth('JWT-auth')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private orgService: OrganizationsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateOrganizationDto })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrganizationDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.orgService.create(userId, dto, logo);
  }

  @Get('my')
  getMyOrgs(@CurrentUser('userId') userId: string) {
    return this.orgService.getMyOrganizations(userId);
  }

  @Post(':id/invite')
  inviteMember(
    @CurrentUser('userId') userId: string,
    @Param('id') orgId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.orgService.invite(userId, orgId, dto);
  }

  @Post(':id/accept')
  acceptInvite(
    @CurrentUser('userId') userId: string,
    @Param('id') orgId: string,
  ) {
    return this.orgService.acceptInvite(userId, orgId);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  update(
    @Param('id') orgId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateOrganizationDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.orgService.update(orgId, userId, dto, logo);
  }
}