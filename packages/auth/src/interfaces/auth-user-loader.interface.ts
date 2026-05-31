import type { AuthenticatedUser } from './authenticated-user.interface';
import type { JwtPayload } from './jwt-payload.interface';

export const AUTH_USER_LOADER = 'STEMVERSE_AUTH_USER_LOADER';

export interface AuthUserLoader {
  loadUser(payload: JwtPayload): Promise<AuthenticatedUser | null>;
}

export function payloadToAuthenticatedUser(payload: JwtPayload): AuthenticatedUser {
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    displayName: null,
  };
}

export const statelessAuthUserLoader: AuthUserLoader = {
  loadUser: async (payload) => payloadToAuthenticatedUser(payload),
};
