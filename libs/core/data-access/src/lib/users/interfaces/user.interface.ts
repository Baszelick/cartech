export enum UserRole {
  SYSTEM_OWNER = 'SYSTEM_OWNER',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  VIEWER = 'VIEWER',
}


export interface User {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  isActive: boolean;
  mustChangePassword: boolean;
  roles: UserRole[];
  locationId: string;
}
