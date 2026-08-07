export interface Car {
  id: string;
  vin?: string;
  shortVin: string;
  brand: string;
  model: string;
  color?: string;
  arrivedOn: string;
  lifecycleStatus: CarLifecycleStatus;
  isBlocked: boolean;
  ownerLocationId: string;
  currentSiteId: string;
}

export interface CarListItem extends Car {
  hasShortVinDuplicate: boolean;
}

export interface CarDetails extends Car {
  hasShortVinDuplicate: boolean;
  blockedReason?: string;
  blockedAt?: string;
  arrivalSiteId?: string;
  archivedReason?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export enum CarLifecycleStatus {
  ARRIVED = 'ARRIVED',
  READY = 'READY',
  ISSUED = 'ISSUED',
  BLOCKED = 'BLOCKED',
  ARCHIVED = 'ARCHIVED',
}
