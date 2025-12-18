// src/modules/organizations/organizations.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';
import { TeamMember } from './entities/team-member.entity';
import { MailModule } from '../mail/mail.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersModule } from '../users/users.module';  

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, TeamMember]),
    UsersModule,           // ← ADD THIS LINE
    MailModule,
    UploadsModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}