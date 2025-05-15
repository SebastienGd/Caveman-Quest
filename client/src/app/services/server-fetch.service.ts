import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiRoute } from '@common/constants/api-routes';
import { Map } from '@common/interfaces/map';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
    providedIn: 'root',
})
export class ServerFetchService {
    constructor(private http: HttpClient) {}

    updateOrCreateMap(updatedMap: Map): Observable<void> {
        return this.makeRequest(ApiRoute.Maps, 'PUT', updatedMap);
    }

    getMaps(): Observable<Map[]> {
        return this.makeRequest<Map[]>(ApiRoute.Maps, 'GET');
    }

    getMap(id: string): Observable<Map> {
        return this.makeRequest<Map>(`${ApiRoute.Maps}/${id}`, 'GET');
    }

    setMapVisibility(id: string, visibility: boolean): Observable<void> {
        return this.makeRequest(`${ApiRoute.Maps + ApiRoute.MapVisibility}/${id}`, 'PATCH', { visibility });
    }

    deleteMap(id: string): Observable<void> {
        return this.makeRequest(`${ApiRoute.Maps}/${id}`, 'DELETE');
    }

    private makeRequest<T>(path: string, method: string, body?: unknown): Observable<T> {
        const options = {
            method,
            headers: new HttpHeaders({
                ['Content-Type']: 'application/json',
            }),
            body: body ? JSON.stringify(body) : undefined,
        };

        return this.http.request<T>(method, environment.serverUrl + path, options); // Pass through the response as it is
    }
}
