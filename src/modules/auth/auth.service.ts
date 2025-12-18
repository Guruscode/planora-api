// src/modules/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpByEmailDto } from './dto/verify-otp.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../common/enums/user-role.enum';
import { ZeptomailService } from '../mail/zeptomail.service';
import * as bcrypt from 'bcrypt';

import { Organization } from '../organizations/entities/organization.entity';
import { TeamMember } from '../organizations/entities/team-member.entity';
import { OrgRole } from '../../common/enums/org-role.enum'; // ← THIS ONE

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Organization)
  private orgRepo: Repository<Organization>,
  
    @InjectRepository(TeamMember)
    private teamRepo: Repository<TeamMember>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: ZeptomailService,
  ) {}
// src/modules/auth/auth.service.ts → replace your register() with this

async register(dto: RegisterDto) {
  let user = await this.usersRepository.findOne({
    where: { email: dto.email },
  });

  // Case 1: Email exists and already verified → tell them to login
  if (user && user.isEmailVerified) {
    throw new BadRequestException('Email already registered and verified. Please login.');
  }

  // Case 2: Email exists but not verified → resend OTP
  if (user && !user.isEmailVerified) {
    await this.sendOtp(user);
    return {
      message: 'Email already registered but not verified. New OTP sent!',
    };
  }

  // Case 3: Brand new user → create with correct role
  const role = dto.role || UserRole.GUEST;

  user = this.usersRepository.create({
    email: dto.email,
    password: dto.password,
    role,
  });

  await this.sendOtp(user);
  await this.usersRepository.save(user);

  return {
    message: 'Registration successful! Check your email for OTP.',
    hint: role === UserRole.ORGANIZER 
      ? 'After verification, you’ll get your organization automatically.'
      : 'You can now buy tickets!',
  };
}

async login(dto: LoginDto) {
  const user = await this.usersRepository.findOne({
    where: { email: dto.email },
    select: ['id', 'email', 'password', 'role', 'isEmailVerified'],
  });

  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  console.log('Stored hash:', user.password);
  console.log('Plain password:', dto.password);
  console.log('bcrypt compare result:', await bcrypt.compare(dto.password, user.password));

  if (!(await user.validatePassword(dto.password))) {
    throw new UnauthorizedException('Invalid credentials');
  }

  if (!user.isEmailVerified) {
    await this.sendOtp(user);
    throw new BadRequestException('Please verify your email first. New OTP sent.');
  }

  return this.generateTokens(user);
}

// src/modules/auth/auth.service.ts → replace verifyOtpByEmail()

async verifyOtpByEmail(dto: VerifyOtpByEmailDto) {
  const user = await this.usersRepository.findOne({
    where: { email: dto.email },
  });

  if (!user) throw new BadRequestException('Email not found');

  if (user.isEmailVerified) {
    throw new BadRequestException('Email already verified');
  }

  if (
    user.otpCode !== dto.code ||
    !user.otpExpiresAt ||
    user.otpExpiresAt < new Date()
  ) {
    throw new BadRequestException('Invalid or expired OTP');
  }

  // MARK AS VERIFIED
  user.isEmailVerified = true;
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;
  await this.usersRepository.save(user);

  // AUTO-CREATE ORGANIZATION IF ORGANIZER
  if (user.role === UserRole.ORGANIZER) {
    const hasOrg = await this.teamRepo.findOne({
      where: { userId: user.id, role: OrgRole.OWNER },
    });

    if (!hasOrg) {
      const orgName = `${user.email.split('@')[0]} Events`;
      const org = this.orgRepo.create({
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      });
      await this.orgRepo.save(org);

      await this.teamRepo.save(
        this.teamRepo.create({
          userId: user.id,
          organizationId: org.id,
          role: OrgRole.OWNER,
          status: 'accepted',
          acceptedAt: new Date(),
        }),
      );
    }
  }

  // AUTO-MAKE FIRST USER ADMIN
  if ((await this.usersRepository.count()) === 1) {
    user.role = UserRole.ADMIN;
    await this.usersRepository.save(user);
  }

  return this.generateTokens(user);
}

  async refreshToken(oldRefreshToken: string) {
    const user = await this.usersRepository.findOne({
      where: { refreshToken: oldRefreshToken },
    });
    if (!user) throw new UnauthorizedException();

    return this.generateTokens(user);
  }

  private generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: this.configService.get('jwt.refreshExpiresIn'),
    });

    user.refreshToken = refreshToken;
    this.usersRepository.save(user); // fire-and-forget

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        photoUrl: user.photoUrl,
      },
    };
  }

  private async sendOtp(user: User) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.otpCode = code;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await this.usersRepository.save(user);

  const success = await this.mailService.sendOtp(
    user.email,
    code,
    user.fullName,
  );

  if (!success) {
    throw new BadRequestException('Failed to send OTP email. Try again.');
  }
}
}