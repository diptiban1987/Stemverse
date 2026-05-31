import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { Course, Lesson, Module } from '@stemverse/database';
import { UserRole } from '@stemverse/database';
import { JwtAuthGuard, Roles, RolesGuard } from '@stemverse/auth';
import { CoursesService } from './courses.service';
import type { CourseWithModules, LessonDetail } from '../types/prisma-payloads';

@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get('tracks')
  listTracks() {
    return this.courses.listTracks();
  }

  @Get('courses')
  listCourses(@Query('track') track?: string) {
    return this.courses.listCourses(track);
  }

  @Get('courses/:slug')
  getCourse(@Param('slug') slug: string) {
    return this.courses.getCourseBySlug(slug);
  }

  @Get('lessons/:id')
  getLesson(@Param('id') id: string): Promise<LessonDetail> {
    return this.courses.getLesson(id);
  }

  @Post('courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.PLATFORM_ADMIN)
  createCourse(
    @Body()
    body: {
      title: string;
      slug: string;
      category: string;
      level: string;
      description?: string;
      trackId?: string;
    },
  ): Promise<Course> {
    return this.courses.createCourse(body);
  }

  @Post('modules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.PLATFORM_ADMIN)
  createModule(@Body() body: { courseId: string; title: string; description?: string }): Promise<Module> {
    return this.courses.createModule(body);
  }

  @Post('lessons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.PLATFORM_ADMIN)
  createLesson(
    @Body() body: { moduleId: string; title: string; contentMd?: string; sortOrder?: number },
  ): Promise<Lesson> {
    return this.courses.createLesson(body);
  }
}
