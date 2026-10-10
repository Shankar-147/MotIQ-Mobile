import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  phoneNumber: string;
  role: Role;
}
