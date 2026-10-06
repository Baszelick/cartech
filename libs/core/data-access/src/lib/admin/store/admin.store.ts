import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { initialAdminState } from './admin.state';
import { computed, inject } from '@angular/core';
import { LocationsService, SitesService } from '@cartech/core/data-access';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

export const AdminStore = signalStore(
  { providedIn: 'root' },

  withState(initialAdminState),

  withComputed((store) => ({
    selectedLocation: computed(
      () => store.locations().find(location => location.id === store.selectedLocationId())
    )
  })),

  withMethods((store) => {
    const locationService = inject(LocationsService)
    const sitesService = inject(SitesService)

    const loadLocations = rxMethod<void>(
      pipe(
        tap(() =>
          patchState(store, {
            loadingLocations: true,
            error: null
          })
        ),

        switchMap(() =>
          locationService.getManagementLocations()
        ),

        tapResponse({
          next: (locations) => {
            patchState(store, {

            });
          },

          error: (error) => {
            patchState(store, {
              // ...
            });
          }
        })

    )

)
