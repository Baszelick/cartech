import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Company } from '../interfaces/company.interface';

@Injectable({
  providedIn: 'root',
})
export class CompaniesService {
  #http = inject(HttpClient)
  #apiUrl = '/api/company';

  getCurrentCompany() {
    return this.#http.get<Company>(`${this.#apiUrl}/me`)
  }
}
