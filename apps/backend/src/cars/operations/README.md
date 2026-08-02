# Cars operation boundaries

- `CarQueryService` contains read-only Car queries.
- `BatteryOperationsService` records a `BatteryCheck` against the oldest open
  calendar period.
- `CarTasksService` returns pending PSO and current actionable battery periods.
- `PsoOperationsService` reads and completes an existing PSO record.
- `VehicleIssueOperationsService` issues an eligible car and records its
  lifecycle transition and event atomically.

Battery scheduling is implemented by the shared `BatteryScheduleService`.
Vehicle return remains outside this module.
