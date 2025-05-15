import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { EditGameService } from '@app/services/edit-game.service';
import { ServerFetchService } from '@app/services/server-fetch.service';
import { GameMode, MapSize, TileBase, TileType } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { EditGamePageComponent } from './edit-game-page.component';

interface QueryParams {
    id: string | undefined;
    size: string | undefined;
    mode: string | undefined;
}

describe('EditGamePageComponent', () => {
    let component: EditGamePageComponent;
    let fixture: ComponentFixture<EditGamePageComponent>;
    let mockEditGameService: jasmine.SpyObj<EditGameService>;
    let mockServerFetchService: jasmine.SpyObj<ServerFetchService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockRoute: jasmine.SpyObj<ActivatedRoute>;
    let queryParamsSubject: BehaviorSubject<QueryParams>;

    beforeEach(async () => {
        mockEditGameService = jasmine.createSpyObj('EditGameService', [
            'fetchMap',
            'generateMap',
            'modifyTile',
            'handleClick',
            'dropItem',
            'resetInteraction',
            'paintTile',
            'isInvalidTile',
            'validateDoors',
            'countObjectOccurence',
            'isValidObjectOccurence',
            'isTerrainTile',
            'isDoorTile',
            'isDoorValid',
            'remainingObjectCount',
        ]);

        mockServerFetchService = jasmine.createSpyObj('ServerFetchService', [
            'updateOrCreateMap',
            'getMaps',
            'getMap',
            'setMapVisibility',
            'deleteMap',
            'makeRequest',
        ]);

        queryParamsSubject = new BehaviorSubject<QueryParams>({ id: '123', size: '10', mode: GameMode.Classical });
        mockRoute = jasmine.createSpyObj('ActivatedRoute', [], {
            queryParams: queryParamsSubject.asObservable(),
        });

        mockEditGameService.map = {
            _id: '123',
            name: 'Test Map',
            description: 'Sample map',
            mode: GameMode.Ctf,
            size: MapSize.Large,
            tiles: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            visibility: true,
        };

        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [EditGamePageComponent],
            providers: [
                { provide: ActivatedRoute, useValue: mockRoute },
                { provide: EditGameService, useValue: mockEditGameService },
                { provide: ServerFetchService, useValue: mockServerFetchService },
                { provide: Router, useValue: mockRouter },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditGamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Component generation', () => {
        describe('handleSaveClick function', () => {
            it('should handle error when content array is present', () => {
                const errorResponse = new HttpErrorResponse({ error: { content: ['Error 1', 'Error 2'] } });

                mockServerFetchService.updateOrCreateMap.and.returnValue(throwError(() => errorResponse));
                component.handleSaveClick();

                expect(component.errors).toEqual(['Error 1', 'Error 2']);
            });

            it('should handle error with no details', () => {
                const errorResponse = new HttpErrorResponse({ error: {} });

                mockServerFetchService.updateOrCreateMap.and.returnValue(throwError(() => errorResponse));
                component.handleSaveClick();

                expect(component.errors).toEqual(["Une erreur est survenue, mais aucun détail n'a été fourni."]);
            });

            it('should call updateOrCreateMap and navigate on handleSaveClick', () => {
                mockServerFetchService.updateOrCreateMap.and.returnValue(of(undefined));
                component.handleSaveClick();
                expect(mockServerFetchService.updateOrCreateMap).toHaveBeenCalledWith(mockEditGameService.map);
                expect(mockRouter.navigate).toHaveBeenCalledWith(['admin']);
            });
        });

        describe('Tile and Object Interaction', () => {
            it('should toggle activeTile in changeTool', () => {
                component.changeTool(TileType.Wall);
                expect(mockEditGameService.activeTile).toEqual(TileType.Wall);

                component.changeTool(TileType.Wall);
                expect(mockEditGameService.activeTile).toBeNull();
            });

            it('should remove object from tile in deleteObject', () => {
                const tile: TileBase = { type: TileType.Base, object: { name: ObjectName.Bone } };
                component.deleteObject(tile);
                expect(tile.object).toBeUndefined();
            });

            it('should set draggedTileWithObject in dragTile', () => {
                const tile: TileBase = { type: TileType.Ice, object: { name: ObjectName.Bone } };
                component.dragTile(tile);
                expect(mockEditGameService.draggedTileWithObject).toEqual(tile);
            });

            it('should set draggedTileWithObject in dragObject', () => {
                component.dragObject(ObjectName.Random);
                expect(mockEditGameService.draggedTileWithObject).toEqual({
                    object: { name: ObjectName.Random },
                    type: TileType.Base,
                });
            });
        });
    });
    describe('Button interactions', () => {
        it('should fetch map on reset click', () => {
            component.handleResetConfirm();
            expect(mockEditGameService.fetchMap).toHaveBeenCalled();
        });
        it('should navigate to admin on cancel click', () => {
            component.handleCancelClick();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['admin']);
        });
    });
});
