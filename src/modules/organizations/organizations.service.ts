import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrgRole } from '../../common/enums/org-role.enum';
import { TeamMember } from './entities/team-member.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ZeptomailService } from '../mail/zeptomail.service';
import { CloudflareR2Service } from '../uploads/cloudflare-r2.service';
import { In } from 'typeorm';
import * as bcrypt from 'bcrypt';                  
import { UserRole } from '../../common/enums/user-role.enum'; 
@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    @InjectRepository(TeamMember)
    private teamRepo: Repository<TeamMember>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private mailService: ZeptomailService,
    private r2Service: CloudflareR2Service,
  ) {}

  // CREATE ORGANIZATION
  async create(userId: string, dto: CreateOrganizationDto, logo?: Express.Multer.File) {
    // Only one org per user (owner)
    const existing = await this.teamRepo.findOne({
      where: { userId, role: OrgRole.OWNER },
    });
    if (existing) throw new BadRequestException('You already own an organization');

    let logoUrl: string | undefined;
    if (logo) {
      const result = await this.r2Service.uploadAvatar(logo);
      logoUrl = result.url;
    }

    const org = this.orgRepo.create({
      ...dto,
      slug: dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      logoUrl,
    });
    await this.orgRepo.save(org);

    // Make creator OWNER
    const membership = this.teamRepo.create({
      userId,
      organizationId: org.id,
      role: OrgRole.OWNER,
      status: 'accepted',
      acceptedAt: new Date(),
    });
    await this.teamRepo.save(membership);

    return org;
  }

async invite(inviterId: string, orgId: string, dto: InviteMemberDto) {
  const membership = await this.teamRepo.findOne({
    where: { userId: inviterId, organizationId: orgId },
  });
  if (!membership || ![OrgRole.OWNER, OrgRole.ADMIN].includes(membership.role)) {
    throw new ForbiddenException('Only owner/admin can invite');
  }

  const org = await this.orgRepo.findOne({ where: { id: orgId } });
  if (!org) throw new NotFoundException();

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  let user = await this.userRepo.findOne({ where: { email: dto.email } });

  if (user) {
    user.inviteCode = code;
    user.inviteCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  } else {
    user = this.userRepo.create({
      email: dto.email,
      password: await bcrypt.hash(code, 12), // ← CODE BECOMES PASSWORD
      inviteCode: code,
      inviteCodeExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      role: UserRole.GUEST,
    });
  }

  await this.userRepo.save(user);

  // Clean old invites + create new pending membership
  await this.teamRepo.delete({ userId: user.id, organizationId: orgId });
  await this.teamRepo.save(
    this.teamRepo.create({
      userId: user.id,
      organizationId: orgId,
      role: dto.role,
      status: 'pending',
    }),
  );

await this.mailService.sendLoginCode(
    dto.email,
    org.name,
    code,
    dto.role.toUpperCase(),
  );

  return { message: 'Login code sent! They can now log in with this code as password.' };
}

  // ACCEPT INVITE
async acceptInvite(userId: string, orgId: string) {
  const invite = await this.teamRepo.findOne({
    where: {
      userId,
      organizationId: orgId,
      status: 'pending',
    },
  });

  if (!invite) {
    throw new BadRequestException('No pending invitation found');
  }

  invite.status = 'accepted';
  invite.acceptedAt = new Date();
  await this.teamRepo.save(invite);

  return { message: 'Successfully joined the organization' };
}

  // GET MY ORGANIZATIONS
async getMyOrganizations(userId: string) {
  const memberships = await this.teamRepo.find({
    where: { userId },
    relations: ['organization'],
    select: {
      id: true,
      role: true,
      status: true,
      organization: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        website: true,
        createdAt: true,
      },
    },
  });

  return memberships.map(m => ({
    membershipId: m.id,
    role: m.role,
    status: m.status,
    organization: m.organization,
  }));
}
async update(
  orgId: string,
  userId: string,
  dto: UpdateOrganizationDto,
  logo?: Express.Multer.File,
) {
  const membership = await this.teamRepo.findOne({
    where: {
      organizationId: orgId,
      userId,
      role: In([OrgRole.OWNER, OrgRole.ADMIN]),
    },
  });

  if (!membership) {
    throw new ForbiddenException('Only owner or admin can update organization');
  }

  const org = await this.orgRepo.findOne({
    where: { id: orgId },
  });

  if (!org) throw new NotFoundException('Organization not found');

  // Update text fields
  if (dto.name) {
    org.name = dto.name;
    org.slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (dto.description !== undefined) org.description = dto.description;
  if (dto.website !== undefined) org.website = dto.website;

  // Handle logo upload
  if (logo) {
    if (org.logoUrl) {
      const oldKey = org.logoUrl.split('/').slice(-2).join('/');
      await this.r2Service.deleteFile(oldKey).catch(() => {});
    }
    const { url } = await this.r2Service.uploadAvatar(logo);
    org.logoUrl = url;
  }

  return this.orgRepo.save(org);
}
}