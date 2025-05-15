import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GameMode, Map, MapSize, TileBase, TileType } from '@common/interfaces/map';
import { GameObject, ObjectName } from '@common/interfaces/object';
import { Subject, throwError } from 'rxjs';
import { GridInteractionMode } from 'src/utils/constants/edit-game-constants';
import { SIZE_TO_QUANTITY } from 'src/utils/constants/object-quantity-constants';
import { EditGameService } from './edit-game.service';
import { MapAlgorithmsService } from './map-algorithms.service';
import { ServerFetchService } from './server-fetch.service';

describe('EditGameService', () => {
    let service: EditGameService;
    let mockTile: TileBase;
    let mockServerFetchService: jasmine.SpyObj<ServerFetchService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockMapAlgorithms: jasmine.SpyObj<MapAlgorithmsService>;

    beforeEach(() => {
        mockServerFetchService = jasmine.createSpyObj('ServerFetchService', [
            'updateOrCreateMap',
            'getMaps',
            'getMap',
            'setMapVisibility',
            'deleteMap',
            'makeRequest',
        ]);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockMapAlgorithms = jasmine.createSpyObj('MapAlgorithmsService', ['validateDoors', 'isDoorTile', 'isTerrainTile', 'countObjectOccurence']);

        TestBed.configureTestingModule({
            providers: [
                EditGameService,
                { provide: ServerFetchService, useValue: mockServerFetchService },
                { provide: Router, useValue: mockRouter },
                { provide: MapAlgorithmsService, useValue: mockMapAlgorithms },
            ],
        });

        service = TestBed.inject(EditGameService);

        service.map = {
            _id: '123',
            name: 'Test Map',
            description: 'Test Description',
            mode: GameMode.Ctf,
            size: 10,
            tiles: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ({ type: TileType.Base }))),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            visibility: true,
        };

        mockTile = service.map.tiles[0][0];

        localStorage.clear();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('fetchMap function', () => {
        it('should navigate to home when fetchMap encounters an error', () => {
            mockServerFetchService.getMap.and.returnValue(throwError(() => new HttpErrorResponse({ statusText: 'Not Found' })));
            service.fetchMap('invalid-id');
            expect(mockRouter.navigate).toHaveBeenCalledWith(['home']);
            expect(service.map).toEqual(service.map);
        });
        it('should set map to local storage if no error', () => {
            const mockObservable = new Subject<Map>();
            const mockMap: Map = {} as Map;
            spyOn(localStorage, 'setItem');
            mockServerFetchService.getMap.and.returnValue(mockObservable);
            service.fetchMap('valid-id');
            mockObservable.next(mockMap);
            expect(localStorage.setItem).toHaveBeenCalledWith('map', JSON.stringify(mockMap));
        });

        it('should retrieve saved maps from local storage', () => {
            const mockedMap = service.generateMap(MapSize.Small, GameMode.Classical);
            spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(mockedMap));
            service.fetchMap('valid-map');
            expect(service.map).toEqual(mockedMap);
        });

        it('should generate map if id is undefined and there is no stored map', () => {
            spyOn(service, 'generateMap');
            service.fetchMap('', MapSize.Medium, GameMode.Classical);
            expect(service.generateMap).toHaveBeenCalledWith(MapSize.Medium, GameMode.Classical);
        });

        it('should call fetchMap with correct parameters when query params change', () => {
            const dummyMap = service.generateMap(MapSize.Small, GameMode.Classical);
            const mockMap = new Subject<Map>();
            mockServerFetchService.getMap.and.returnValue(mockMap);
            service.fetchMap('valid-id');
            mockMap.next(dummyMap);
            expect(service.map).toEqual(dummyMap);
        });

        it('should call fetchMap with incorrect parameters', () => {
            mockServerFetchService.getMap.and.returnValue(throwError(() => new HttpErrorResponse({ statusText: 'Not Found' })));
            service.fetchMap();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['home']);
        });

        it('should navigate to home when missing url params', () => {
            service.fetchMap();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['home']);
        });
    });

    it('should modify tile when interaction mode is PAINT', () => {
        service['interactionMode'] = GridInteractionMode.Paint;
        service.activeTile = TileType.Water;
        service.modifyTile(mockTile);
        expect(mockTile.type).toBe(TileType.Water);
    });

    it('should delete tile when interaction mode is DELETE', () => {
        mockTile.type = TileType.Wall;
        service['interactionMode'] = GridInteractionMode.Delete;
        service.modifyTile(mockTile);
        expect(mockTile.type).toBe(TileType.Base);
    });

    it('should not change tile when interaction mode is DELETE and targeted tile is of type BASE', () => {
        mockTile.type = TileType.Base;
        service['interactionMode'] = GridInteractionMode.Delete;
        service.modifyTile(mockTile);
        expect(mockTile.type).toBe(TileType.Base);
    });

    it('should toggle door state on handleClick', () => {
        mockMapAlgorithms.isDoorTile.and.returnValue(true);
        mockMapAlgorithms.isTerrainTile.and.returnValue(false);
        service.activeTile = TileType.ClosedDoor;
        mockTile.type = TileType.ClosedDoor;
        service.handleClick(mockTile, GridInteractionMode.Paint);
        expect(mockTile.type).toBe(TileType.OpenedDoor);
        service.handleClick(mockTile, GridInteractionMode.Paint);
        expect(mockTile.type).toBe(TileType.ClosedDoor);
    });

    it('should paint a closed door', () => {
        service.activeTile = TileType.ClosedDoor;
        mockTile.type = TileType.Base;
        service['paintTile'](mockTile);
        expect(mockTile.type).toBe(TileType.ClosedDoor);
    });

    it('should drop an item correctly', () => {
        mockMapAlgorithms.isTerrainTile.and.returnValue(true);
        const sourceTile = { type: TileType.Base, object: { name: 'steak' } } as TileBase;
        const destinationTile = { type: TileType.Base } as TileBase;

        service.draggedTileWithObject = sourceTile;
        service.dropItem(destinationTile);

        expect(destinationTile.object).toEqual({ name: 'steak' } as GameObject);
        expect(sourceTile.object).toBeUndefined();
    });

    it('should reset interaction mode', () => {
        service['interactionMode'] = GridInteractionMode.Paint;
        service.draggedTileWithObject = mockTile;
        service.resetInteraction();

        expect(service['interactionMode']).toBe(GridInteractionMode.Idle as number);
        expect(service.draggedTileWithObject).toBeNull();
    });

    it('should delete item if dragged outside map', () => {
        service.draggedTileWithObject = mockTile;
        service.draggedTileWithObject.object = { name: ObjectName.Flag } as GameObject;
        service.dropItemOutsideMap();
        expect<TileBase | null>(service.draggedTileWithObject).toBeNull();
    });

    it('should validate unique object occurrence correctly', () => {
        mockMapAlgorithms.countObjectOccurence.and.returnValue(1);
        const allowedAddition = service.isValidObjectOccurence('bone');
        expect(allowedAddition).toBeFalse();
    });

    it('should validate random object occurrence correctly', () => {
        mockMapAlgorithms.countObjectOccurence.and.returnValue(1);
        const allowedAddition = service.isValidObjectOccurence('random');
        expect(allowedAddition).toBeTrue();
    });

    it('should validate spawnpoints object occurrence correctly', () => {
        mockMapAlgorithms.countObjectOccurence.and.returnValue(2);
        const allowedAddition = service.isValidObjectOccurence('spawnpoints');
        expect(allowedAddition).toBeFalse();
    });

    it('should return the remaining object count', () => {
        mockMapAlgorithms.countObjectOccurence.and.returnValue(1);
        const quantity = SIZE_TO_QUANTITY[MapSize.Small][ObjectName.Random.toString()];
        const count = service.remainingObjectCount(ObjectName.Random);
        expect(count).toBe(quantity - 1);
    });
});
