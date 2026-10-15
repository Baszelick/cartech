import { VIN_PREFIXES } from './vin.config';

export type VinPrefix = keyof typeof VIN_PREFIXES;

export type VehicleManufacturer = (typeof VIN_PREFIXES)[VinPrefix];

export interface VinParseResult {
  vin: string;
  prefix: VinPrefix;
  manufacturer: VehicleManufacturer;
}
