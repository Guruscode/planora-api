import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CloudflareR2Service } from '../uploads/cloudflare-r2.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private r2Service: CloudflareR2Service,
  ) {}

  async getMe(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'fullName', 'phone', 'photoUrl', 'role', 'createdAt'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, file?: Express.Multer.File) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException();

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.phone) user.phone = dto.phone;

    if (file) {
      // Delete old photo if exists
      if (user.photoUrl) {
        const oldKey = user.photoUrl.split('/').slice(-2).join('/');
        await this.r2Service.deleteFile(oldKey).catch(() => {});
      }

      const { url } = await this.r2Service.uploadAvatar(file);
      user.photoUrl = url;
    }

    await this.usersRepository.save(user);
    return this.getMe(userId);
  }
}