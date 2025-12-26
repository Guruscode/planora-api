import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
  ) {}

  async getPreferences(userId: string) {
    return {
      userId,
      push: true,
      email: true,
      sms: false,
    };
  }

  async updatePreferences(userId: string, prefs: any) {
    return { ...prefs, userId };
  }

  async feed(userId: string) {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async push(userId: string, title: string, body?: string, category = 'general') {
    const notif = this.notificationRepo.create({ userId, title, body, category });
    return this.notificationRepo.save(notif);
  }
}
