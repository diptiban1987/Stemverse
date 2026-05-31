export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
  organizationId?: string | null;
}
