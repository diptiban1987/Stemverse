import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@stemverse/auth';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.users.getProfile(user.id);
  }

  @Get('me/dashboard')
  dashboard(@CurrentUser() user: { id: string }) {
    return this.users.getDashboard(user.id);
  }
}
