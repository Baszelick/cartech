import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserLocationAccessService } from './user-location-access.service';
import { UserRolesService } from './user-roles.service';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, UserLocationAccessService, UserRolesService],
})
export class UsersModule {}
