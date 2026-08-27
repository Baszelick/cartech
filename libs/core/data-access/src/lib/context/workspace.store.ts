import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { catchError, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';

import { CompaniesService } from '../company';
import { LocationsService } from '../locations';
import { SitesService } from '../sites';
import { initialWorkspace } from './workspace.state';

export const WorkspaceStore = signalStore(
  { providedIn: 'root' },

  withState(initialWorkspace),

  withComputed((store) => ({
    currentLocation: computed(
      () => store.locations().find((location) => location.id === store.currentLocationId()) ?? null,
    ),

    currentSite: computed(
      () => store.sites().find((site) => site.id === store.currentSiteId()) ?? null,
    ),

    hasMultipleLocations: computed(() => store.locations().length > 1),

    hasMultipleSites: computed(() => store.sites().length > 1),
  })),

  withMethods((store) => {
    const companyService = inject(CompaniesService);
    const locationsService = inject(LocationsService);
    const sitesService = inject(SitesService);

    const loadSites = (locationId: string): Observable<void> =>
      sitesService.getSites(locationId).pipe(
        tap((sites) => {
          const currentSiteId = sites.length === 1 ? sites[0].id : null;

          patchState(store, {
            sites,
            currentSiteId,
          });
        }),

        catchError(() => {
          patchState(store, {
            sites: [],
            currentSiteId: null,
            error: 'Не удалось загрузить площадки',
          });

          return of(void 0);
        }),

        map(() => void 0),
      );

    return {
      selectLocation(id: string): void {
        patchState(store, {
          currentLocationId: id,
          currentSiteId: null,
          sites: [],
          error: null,
        });

        loadSites(id).subscribe();
      },

      selectSite(id: string): void {
        patchState(store, {
          currentSiteId: id,
        });
      },

      loadWorkspace(): Observable<void> {
        patchState(store, {
          loading: true,
          error: null,
        });

        return forkJoin({
          company: companyService.getCurrentCompany(),
          locations: locationsService.getLocations(),
        }).pipe(
          switchMap(({ company, locations }) => {
            const currentLocationId = locations.length === 1 ? locations[0].id : null;

            patchState(store, {
              company,
              locations,
              currentLocationId,
              sites: [],
              currentSiteId: null,
              loading: false,
            });

            return currentLocationId ? loadSites(currentLocationId) : of(void 0);
          }),

          catchError(() => {
            patchState(store, {
              loading: false,
              error: 'Не удалось загрузить рабочий контекст',
            });

            return of(void 0);
          }),

          map(() => void 0),
        );
      },

      reset(): void {
        patchState(store, initialWorkspace);
      },
    };
  }),
);
