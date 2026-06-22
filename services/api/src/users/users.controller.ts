import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
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

  @Patch('me')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() body: { displayName?: string },
  ) {
    return this.users.updateProfile(user.id, body);
  }
}
