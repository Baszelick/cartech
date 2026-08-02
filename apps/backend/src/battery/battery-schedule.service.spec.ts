import {
  BatteryScheduleService,
  BatteryTaskStatus,
} from './battery-schedule.service';

describe('BatteryScheduleService', () => {
  const service = new BatteryScheduleService();
  const arrivedOn = new Date('2026-08-01T00:00:00.000Z');

  it('schedules the first check 30 calendar days after arrival', () => {
    expect(service.getDueDate(arrivedOn, 1)).toEqual(
      new Date('2026-08-31T00:00:00.000Z'),
    );
  });

  it('anchors every following period to arrival', () => {
    expect(service.getDueDate(arrivedOn, 2)).toEqual(
      new Date('2026-09-30T00:00:00.000Z'),
    );
    expect(service.getDueDate(arrivedOn, 3)).toEqual(
      new Date('2026-10-30T00:00:00.000Z'),
    );
  });

  it('allows a check three days before the due date', () => {
    expect(
      service.getCurrentPeriod(
        arrivedOn,
        0,
        new Date('2026-08-28T18:00:00.000Z'),
      ),
    ).toMatchObject({
      periodNumber: 1,
      status: BatteryTaskStatus.UPCOMING,
      canComplete: true,
    });
  });

  it('does not shift the schedule after an early or late check', () => {
    const next = service.getCurrentPeriod(
      arrivedOn,
      1,
      new Date('2026-10-05T00:00:00.000Z'),
    );

    expect(next.periodNumber).toBe(2);
    expect(next.dueOn).toEqual(new Date('2026-09-30T00:00:00.000Z'));
    expect(next.status).toBe(BatteryTaskStatus.OVERDUE);
  });

  it('closes only one period per completed check', () => {
    expect(
      service.getCurrentPeriod(
        arrivedOn,
        1,
        new Date('2026-11-15T00:00:00.000Z'),
      ).periodNumber,
    ).toBe(2);
    expect(
      service.getCurrentPeriod(
        arrivedOn,
        2,
        new Date('2026-11-15T00:00:00.000Z'),
      ).periodNumber,
    ).toBe(3);
  });

  it.each([
    ['2026-08-28', BatteryTaskStatus.UPCOMING],
    ['2026-08-30', BatteryTaskStatus.URGENT],
    ['2026-08-31', BatteryTaskStatus.URGENT],
    ['2026-09-01', BatteryTaskStatus.OVERDUE],
  ])('classifies %s as %s', (date, status) => {
    expect(
      service.getCurrentPeriod(arrivedOn, 0, new Date(`${date}T00:00:00.000Z`))
        .status,
    ).toBe(status);
  });

  it('calculates how many periods are due by a date', () => {
    expect(
      service.getRequiredCheckCount(
        arrivedOn,
        new Date('2026-10-30T00:00:00.000Z'),
      ),
    ).toBe(3);
  });
});
