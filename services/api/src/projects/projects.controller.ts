import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ProjectType } from '@prisma/client';
import { CurrentUser, JwtAuthGuard } from '@stemverse/auth';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query('type') type?: ProjectType,
  ) {
    return this.projects.listForUser(user.id, type);
  }

  @Get(':id')
  get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.projects.getById(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProjectDto,
    @Req() req: Request,
  ) {
    return this.projects.create(user.id, dto, req.ip);
  }

  @Put(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: Request,
  ) {
    return this.projects.update(user.id, id, dto, req.ip);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.projects.remove(user.id, id, req.ip);
  }
}
