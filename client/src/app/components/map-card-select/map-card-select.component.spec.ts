import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ServerFetchService } from '@app/services/server-fetch.service';
import { GameMode, Map } from '@common/interfaces/map';
import { of } from 'rxjs';
import { MapCardSelectComponent } from './map-card-select.component';

describe('MapCardSelectComponent', () => {
    let fixture: ComponentFixture<MapCardSelectComponent>;
    let component: MapCardSelectComponent;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockServerFetchService: jasmine.SpyObj<ServerFetchService>;

    beforeEach(async () => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockServerFetchService = jasmine.createSpyObj('ServerFetchService', ['getMap']);

        await TestBed.configureTestingModule({
            imports: [MapCardSelectComponent],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        queryParams: of({ mode: 'Capture the Flag' }),
                    },
                },
                {
                    provide: Router,
                    useValue: mockRouter,
                },
                {
                    provide: ServerFetchService,
                    useValue: mockServerFetchService,
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(MapCardSelectComponent);
        component = fixture.componentInstance;

        component.map = {
            _id: '123',
            name: 'Test Map',
            description: 'A sample map for testing',
            mode: GameMode.Ctf,
            size: 10,
            tiles: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            visibility: true,
        };

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should navigate to character-selection page when the selected map is available', () => {
        mockServerFetchService.getMap.and.returnValue(
            of({
                visibility: true,
            } as Map),
        );

        component.isMapAvailable(component.map._id);

        expect(mockRouter.navigate).toHaveBeenCalledWith(['character-selection'], { queryParams: { id: component.map._id } });
    });

    it('should set showErrorPopup to true when the selected map is not available', () => {
        mockServerFetchService.getMap.and.returnValue(
            of({
                visibility: false,
            } as Map),
        );

        component.isMapAvailable(component.map._id);

        expect(component.showErrorPopup).toBeTrue();
    });

    it('should set errorMessage when the map is not available', () => {
        mockServerFetchService.getMap.and.returnValue(
            of({
                visibility: false,
            } as Map),
        );

        component.isMapAvailable(component.map._id);

        expect(component.errorMessage).toBe("Cette carte de jeu n'est plus disponible.");
    });

    it('should unsubscribe on destroy', () => {
        spyOn(component['ngUnsubscribe'], 'next');
        spyOn(component['ngUnsubscribe'], 'complete');

        component.ngOnDestroy();

        expect(component['ngUnsubscribe'].next).toHaveBeenCalled();
        expect(component['ngUnsubscribe'].complete).toHaveBeenCalled();
    });
});
