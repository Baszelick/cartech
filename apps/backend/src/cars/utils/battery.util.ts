import { BatteryStatus } from '../enums/battery-status.enum';

export function getBatteryStatus(daysLeft: number): BatteryStatus {
  if (daysLeft < 0) return BatteryStatus.OVERDUE;
  if (daysLeft === 0) return BatteryStatus.CRITICAL;
  if (daysLeft <= 3) return BatteryStatus.WARNING;
  return BatteryStatus.OK;
}

export function getDaysLeft(nextBatteryCheckAt: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = nextBatteryCheckAt.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
