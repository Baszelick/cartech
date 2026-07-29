# Cars operation boundaries

- `CarQueryService` contains read-only Car queries.
- `BatteryOperationsService` records completed `BatteryCheck` facts only.
- PSO operations are deferred until the PSO policy is confirmed.
- Issue operations are deferred until the issue workflow is migrated.

No task scheduling, PSO workflow, or issue workflow is implemented here.

The legacy battery status helper remains temporarily because Dashboard still
imports it; CarsModule no longer depends on it.
