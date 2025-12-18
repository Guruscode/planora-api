// src/modules/users/users.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UploadsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [
    UsersService,        // ← you probably already have this
    TypeOrmModule,       // ← ADD THIS LINE ONLY
  ],
})
export class UsersModule {}