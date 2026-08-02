import { Injectable } from '@nestjs/common';

export enum BatteryTaskStatus {
  UPCOMING = 'UPCOMING',
  URGENT = 'URGENT',
  OVERDUE = 'OVERDUE',
}

export interface BatterySchedulePeriod {
  periodNumber: number;
  dueOn: Date;
  status: BatteryTaskStatus | null;
  canComplete: boolean;
}

const PERIOD_DAYS = 30;
const UPCOMING_DAYS = 3;
const URGENT_DAYS = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class BatteryScheduleService {
  getRequiredCheckCount(arrivedOn: Date, asOf: Date): number {
    const elapsedDays = this.daysBetween(arrivedOn, asOf);
    return Math.max(0, Math.floor(elapsedDays / PERIOD_DAYS));
  }

  getDueDate(arrivedOn: Date, periodNumber: number): Date {
    if (!Number.isInteger(periodNumber) || periodNumber < 1) {
      throw new RangeError('Battery period number must be a positive integer');
    }

    const dueOn = this.toUtcDate(arrivedOn);
    dueOn.setUTCDate(dueOn.getUTCDate() + PERIOD_DAYS * periodNumber);
    return dueOn;
  }

  getCurrentPeriod(
    arrivedOn: Date,
    completedChecks: number,
    asOf: Date,
  ): BatterySchedulePeriod {
    if (!Number.isInteger(completedChecks) || completedChecks < 0) {
      throw new RangeError('Completed battery checks must be a non-negative integer');
    }

    const periodNumber = completedChecks + 1;
    const dueOn = this.getDueDate(arrivedOn, periodNumber);
    const daysUntilDue = this.daysBetween(asOf, dueOn);
    const status = this.getStatus(daysUntilDue);

    return {
      periodNumber,
      dueOn,
      status,
      canComplete: daysUntilDue <= UPCOMING_DAYS,
    };
  }

  private getStatus(daysUntilDue: number): BatteryTaskStatus | null {
    if (daysUntilDue < 0) return BatteryTaskStatus.OVERDUE;
    if (daysUntilDue <= URGENT_DAYS) return BatteryTaskStatus.URGENT;
    if (daysUntilDue <= UPCOMING_DAYS) return BatteryTaskStatus.UPCOMING;
    return null;
  }

  private daysBetween(from: Date, to: Date): number {
    return Math.floor(
      (this.toUtcDate(to).getTime() - this.toUtcDate(from).getTime()) / DAY_MS,
    );
  }

  private toUtcDate(value: Date): Date {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
      ),
    );
  }
}
