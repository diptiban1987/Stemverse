import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark routes with required roles.
 * Usage: @Roles('PLATFORM_ADMIN', 'TEACHER')
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
