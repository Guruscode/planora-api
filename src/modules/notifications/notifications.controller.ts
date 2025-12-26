import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('preferences')
  getPreferences(@CurrentUser('userId') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Post('preferences')
  updatePreferences(@CurrentUser('userId') userId: string, @Body() prefs: any) {
    return this.notificationsService.updatePreferences(userId, prefs);
  }

  @Get('feed')
  feed(@CurrentUser('userId') userId: string) {
    return this.notificationsService.feed(userId);
  }
}
