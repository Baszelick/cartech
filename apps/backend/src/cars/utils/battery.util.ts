import { BatteryStatus } from '../enums/battery-status.enum';

export function getBatteryStatus(daysLeft: number): BatteryStatus {
  if (daysLeft < 0) return BatteryStatus.OVERDUE;
  if (daysLeft === 0) return BatteryStatus.CRITICAL;
  if (daysLeft <= 3) return BatteryStatus.WARNING;
  return BatteryStatus.OK;
}

export function getDaysLeft(nextBatteryCheckAt: Date): number {
  const today = new Date();

  const diff = nextBatteryCheckAt.getTime() - today.getTime();

  const MS_IN_DAY = 24 * 60 * 60 * 1000;

  return Math.ceil(diff / MS_IN_DAY);
}
