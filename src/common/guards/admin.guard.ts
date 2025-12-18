import { Injectable } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../enums/user-role.enum';
import { Roles } from '../decorators/roles.decorator';

@Roles(UserRole.ADMIN)
@Injectable()
export class AdminGuard extends RolesGuard {}