import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServerFetchService } from '@app/services/server-fetch.service';
import { GameMode, Map } from '@common/interfaces/map';
import { environment } from 'src/environments/environment';

describe('ServerFetchService', () => {
    let httpMock: HttpTestingController;
    let service: ServerFetchService;
    let baseUrl: string;
    let mockMaps: Map[];

    beforeEach(() => {
        mockMaps = [
            {
                _id: '1',
                name: 'Test Map',
                description: 'A simple test map with basic properties',
                mode: GameMode.Ctf,
                size: 10,
                tiles: [[]],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                visibility: true,
            },
            {
                _id: '2',
                name: 'Test Map2',
                description: 'SECOND MAP',
                mode: GameMode.Ctf,
                size: 10,
                tiles: [[]],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                visibility: true,
            },
        ];

        TestBed.configureTestingModule({
            imports: [],
            providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
        });

        service = TestBed.inject(ServerFetchService);
        httpMock = TestBed.inject(HttpTestingController);
        baseUrl = environment.serverUrl + '/api';
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should create or update a map', () => {
        service.updateOrCreateMap(mockMaps[1]).subscribe((response) => {
            expect(response).toBeNull();
        });

        const req = httpMock.expectOne(`${baseUrl}/maps`);
        expect(req.request.method).toBe('PUT');
        req.flush(null);
    });

    it('should return a list of maps', () => {
        service.getMaps().subscribe((response) => {
            expect(response).toEqual(mockMaps);
        });

        const req = httpMock.expectOne(`${baseUrl}/maps`);
        expect(req.request.method).toBe('GET');
        req.flush(mockMaps);
    });

    it('should return a specific map by id', () => {
        service.getMap('1').subscribe((response) => {
            expect(response).toEqual(mockMaps[0]);
        });

        const req = httpMock.expectOne(`${baseUrl}/maps/1`);
        expect(req.request.method).toBe('GET');
        req.flush(mockMaps[0]);
    });

    it('should set map visibility', () => {
        service.setMapVisibility('1', true).subscribe();

        const req = httpMock.expectOne(`${baseUrl}/maps/visibility/1`);
        expect(req.request.method).toBe('PATCH');
        req.flush({});
    });

    it('should delete a map', () => {
        service.deleteMap('1').subscribe();

        const req = httpMock.expectOne(`${baseUrl}/maps/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush({});
    });

    it('should handle http error safely', () => {
        service.getMaps().subscribe({
            next: () => {
                fail('expected an error, not maps');
            },
            error: (error) => {
                expect(error).toBeTruthy();
                expect(error.message).toContain('Http failure response');
            },
        });

        const req = httpMock.expectOne(`${baseUrl}/maps`);
        expect(req.request.method).toBe('GET');
        req.flush(null, { status: 500, statusText: 'Internal Server Error' });
    });
});
