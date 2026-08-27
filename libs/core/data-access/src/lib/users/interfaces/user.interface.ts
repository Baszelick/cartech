import type { Location } from '../../locations';

export enum UserRole {
  SYSTEM_OWNER = 'SYSTEM_OWNER',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  VIEWER = 'VIEWER',
}

export interface UserSummary {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  roles: UserRole[];
}

export interface CreatedUser extends UserSummary {
  locationIds: string[];
}

export interface UserLocationAccess {
  userId: string;
  locations: Location[];
}
