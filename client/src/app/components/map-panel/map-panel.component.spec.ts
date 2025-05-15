import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ServerFetchService } from '@app/services/server-fetch.service';
import { GameMode, Map } from '@common/interfaces/map';
import { of } from 'rxjs';
import adminConstants from 'src/utils/constants/admin-constants';
import { MapPanelComponent } from './map-panel.component';

@Component({
    selector: 'app-map-card',
    template: '',
})
class MockMapCardComponent {
    @Input() map!: Map;
}

@Component({
    selector: 'app-map-card-select',
    template: '',
})
class MockMapCardSelectComponent {
    @Input() map!: Map;
}

const SMALL_MAP_SIZE = 10;
const MEDIUM_MAP_SIZE = 12;

describe('MapPanelComponent', () => {
    let fixture: ComponentFixture<MapPanelComponent>;
    let component: MapPanelComponent;
    let mockServerFetchService: jasmine.SpyObj<ServerFetchService>;
    let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;

    beforeEach(async () => {
        mockActivatedRoute = jasmine.createSpyObj('ActivatedRoute', [], {
            paramMap: of(convertToParamMap({ id: '123' })),
        });
        mockServerFetchService = jasmine.createSpyObj('ServerFetchService', ['getMaps']);

        const mockMaps: Map[] = [
            {
                _id: '1',
                createdAt: '2025-01-21T00:00:00Z',
                description: 'First frozen battle arena',
                mode: GameMode.Ctf,
                name: 'Map One',
                size: SMALL_MAP_SIZE,
                tiles: [],
                updatedAt: '2025-02-06T18:53:14.728Z',
                visibility: true,
            },
            {
                _id: '2',
                createdAt: '2025-01-22T00:00:00Z',
                description: 'Second arena',
                mode: GameMode.Ctf,
                name: 'Map Two',
                size: SMALL_MAP_SIZE,
                tiles: [],
                updatedAt: '2025-02-07T18:53:14.728Z',
                visibility: true,
            },
            {
                _id: '3',
                createdAt: '2025-01-23T00:00:00Z',
                description: 'Hidden trap map',
                mode: GameMode.Classical,
                name: 'Hidden Map',
                size: SMALL_MAP_SIZE,
                tiles: [],
                updatedAt: '2025-02-08T18:53:14.728Z',
                visibility: false,
            },
            {
                _id: '4',
                createdAt: '2025-01-24T00:00:00Z',
                description: 'Desert battle arena',
                mode: GameMode.Ctf,
                name: 'Map Four',
                size: MEDIUM_MAP_SIZE,
                tiles: [],
                updatedAt: '2025-02-09T18:53:14.728Z',
                visibility: true,
            },
        ];
        mockServerFetchService.getMaps.and.returnValue(of(mockMaps));

        await TestBed.configureTestingModule({
            imports: [MapPanelComponent, MockMapCardComponent, MockMapCardSelectComponent],
            providers: [
                { provide: ServerFetchService, useValue: mockServerFetchService },
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(MapPanelComponent);
        component = fixture.componentInstance;
        fixture.autoDetectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should filter maps based on visibility when cardType is not "admin"', () => {
        component.cardType = 'user';
        component.ngOnInit();

        const numberExpected = 3;
        expect(component.maps.length).toBe(numberExpected);
    });

    it('should return the correct displayed maps', () => {
        component.currentIndex = 0;
        expect(component.displayedMaps.length).toBe(Math.min(adminConstants.mapsPerPage, component.maps.length));
        expect(component.displayedMaps[0].name).toBe('Map One');
    });

    it('should navigate to the previous page', () => {
        component.currentIndex = adminConstants.mapsPerPage;
        component.prevPage();
        expect(component.currentIndex).toBe(0);
    });

    it('should not go to previous page if already on the first page', () => {
        component.currentIndex = 0;
        component.prevPage();
        expect(component.currentIndex).toBe(0);
    });

    it('should navigate to the next page', () => {
        component.maps = [...component.maps, ...component.maps];
        component.currentIndex = 0;
        component.nextPage();
        expect(component.currentIndex).toBe(Math.min(adminConstants.mapsPerPage, component.maps.length));
    });

    it('should update currentIndex when currentIndex is out of bounds after map deletion', () => {
        component.currentIndex = component.maps.length;
        const updatedMaps: Map[] = component.maps.slice(0, 2);
        mockServerFetchService.getMaps.and.returnValue(of(updatedMaps));

        component.handleMapDeleted();
        expect(component.currentIndex).toBe(Math.max(0, component.currentIndex - adminConstants.mapsPerPage));
    });

    it('should not go to the next page if already at the last set of maps', () => {
        component.currentIndex = component.maps.length;
        component.nextPage();
        expect(component.currentIndex).toBe(component.maps.length);
    });

    it('should render MapCardComponent when cardType is "admin"', () => {
        component.cardType = 'admin';
        fixture.detectChanges();
        const mapCards = fixture.nativeElement.querySelectorAll('app-map-card');
        expect(mapCards.length).toBeGreaterThan(0);
    });

    it('should render MapCardSelectComponent when cardType is not "admin"', () => {
        component.cardType = 'user';
        fixture.detectChanges();
        const mapCardSelects = fixture.nativeElement.querySelectorAll('app-map-card-select');
        expect(mapCardSelects.length).toBeGreaterThan(0);
    });

    it('should call handleMapDeleted', () => {
        spyOn(component, 'handleMapDeleted').and.callThrough();
        component.handleMapDeleted();
        expect(component.handleMapDeleted).toHaveBeenCalled();
    });
});
