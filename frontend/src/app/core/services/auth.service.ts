import {inject, Injectable} from "@angular/core";
import {LoginRequest, LoginResponse} from "../interfaces/auth.interface";
import {HttpClient} from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    #http = inject(HttpClient);
    #apiUrl = '/api/auth';


    login(req: LoginRequest) {
      return this.#http.post<LoginResponse>(`${this.#apiUrl}/login`, req)
    }


}