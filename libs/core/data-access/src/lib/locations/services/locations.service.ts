import {inject, Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {
  CreateLocationDto,
  UpdateLocationDto,
  Location
} from '../interfaces/locations.interface';

@Injectable({
  providedIn: 'root',
})
export class LocationsService {
  #http = inject(HttpClient)
  #apiUrl = '/api/locations'

  getLocations() {
    return this.#http.get<Location[]>(this.#apiUrl)
  }

  createLocation(dto: CreateLocationDto) {
    return this.#http.post<Location>(this.#apiUrl, dto)
  }

  deactivateLocation(id: string) {
    return this.#http.patch<Location>(`${this.#apiUrl}/${id}/deactivate`, {})
  }

  updateLocation(id: string, dto: UpdateLocationDto) {
    return this.#http.patch<Location>(`${this.#apiUrl}/${id}`, dto);
  }


}
