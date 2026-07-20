export class CreateCarDto {
  vin: string;
  brand: string;
  model: string;
  color: string;
  arrivalDate: Date;
  nextBatteryCheckAt: Date;
}
