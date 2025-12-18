
import { Global, Module } from '@nestjs/common';
import { ZeptomailService } from './zeptomail.service';

@Global()                         // ← THIS LINE WAS MISSING!
@Module({
  providers: [ZeptomailService],
  exports: [ZeptomailService],
})
export class MailModule {}