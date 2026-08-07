export interface Location {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface CreateLocationDto {
  code: string;
  name: string;
}

export type UpdateLocationDto = Partial<CreateLocationDto>;
