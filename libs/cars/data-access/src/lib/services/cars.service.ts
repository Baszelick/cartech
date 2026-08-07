import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CarDetails, CarListItem } from '../interfaces/car.interface';

@Injectable({
  providedIn: 'root'
})
export class CarsService {
  #http = inject(HttpClient);
  #apiUrl = '/api/cars';

  getCars() {
    return this.#http.get<CarListItem[]>(this.#apiUrl);
  }

  getCar(id: string) {
    return this.#http.get<CarDetails>(`${this.#apiUrl}/${id}`);
  }
}
