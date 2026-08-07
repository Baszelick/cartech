import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Site, SiteDto } from '../interfaces/site.interface';

@Injectable({
  providedIn: 'root',
})
export class SitesService {
  #http = inject(HttpClient);
  #apiUrl = '/api/locations';

  createSite(locationId: string, dto: SiteDto) {
    return this.#http.post<Site>(`${this.#apiUrl}/${locationId}/sites`, dto);
  }

  getSites(locationId: string) {
    return this.#http.get<Site[]>(`${this.#apiUrl}/${locationId}/sites`);
  }

  deactivateSite(siteId: string, locationId: string) {
    return this.#http.patch<Site>(`${this.#apiUrl}/${locationId}/sites/${siteId}/deactivate`, {});
  }

  updateSite(siteId: string, dto: SiteDto, locationId: string) {
    return this.#http.patch<Site>(`${this.#apiUrl}/${locationId}/sites/${siteId}`, dto);
  }
}
