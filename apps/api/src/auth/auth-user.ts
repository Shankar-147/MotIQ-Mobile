import { Role } from '@prisma/client';

// What the guard puts on the request once a token has been checked.
export interface AuthUser {
  id: string;
  phoneNumber: string;
  name: string | null;
  role: Role;
}
