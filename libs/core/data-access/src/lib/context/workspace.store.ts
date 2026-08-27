import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { catchError, forkJoin, map, Observable, of, tap } from 'rxjs';

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

    const loadSites = (locationId: string): void => {
      sitesService.getSites(locationId).subscribe({
        next: (sites) => {
          const currentSiteId = sites.length === 1 ? sites[0].id : null;

          patchState(store, {
            sites,
            currentSiteId,
          });
        },

        error: () => {
          patchState(store, {
            sites: [],
            currentSiteId: null,
            error: 'Не удалось загрузить площадки',
          });
        },
      });
    };

    return {
      selectLocation(id: string): void {
        patchState(store, {
          currentLocationId: id,
          currentSiteId: null,
          sites: [],
          error: null,
        });

        loadSites(id);
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
          tap(({ company, locations }) => {
            const currentLocationId = locations.length === 1 ? locations[0].id : null;

            patchState(store, {
              company,
              locations,
              currentLocationId,
              sites: [],
              currentSiteId: null,
              loading: false,
            });

            if (currentLocationId) {
              loadSites(currentLocationId);
            }
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
    };
  }),
);
