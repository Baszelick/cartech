import { Module } from '@nestjs/common';
import { ArrivalsController } from './arrivals.controller';
import { ArrivalsService } from './arrivals.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ArrivalsController],
  providers: [ArrivalsService],
})
export class ArrivalsModule {}
