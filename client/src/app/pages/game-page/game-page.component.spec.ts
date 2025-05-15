import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameService } from '@app/services/game.service';
import { GameBase } from '@common/interfaces/game';
import { TileBase, TileData, TileType } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { mockGame } from 'src/tests/mock-game';
import { TYPE_TO_DESCRIPTION } from 'src/utils/constants/description-constants';
import { translateObjectName } from 'src/utils/constants/object-translations';
import { GamePageComponent } from './game-page.component';
describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let fixture: ComponentFixture<GamePageComponent>;
    let mockedGameService: jasmine.SpyObj<GameService>;
    let mockedGame: GameBase;

    beforeEach(async () => {
        mockedGame = JSON.parse(JSON.stringify(mockGame));

        mockedGameService = jasmine.createSpyObj(
            'GameService',
            [
                'refreshGame',
                'disconnect',
                'findEntitiesAtProximity',
                'initiateCombat',
                'interactDoor',
                'movePlayer',
                'findFastestRoute',
                'handleTurnEnd',
                'findPlayer',
            ],
            {
                localGame: signal(mockedGame),
                currentPlayer: mockedGame.players[0],
                opponentPlayer: mockedGame.players[3],
                currentTile: mockedGame.map.tiles[9][2],
                transitionMessage: 'transition message',
                transitionPlayer: mockedGame.players[1],
                currentTime: 30,
            },
        );

        await TestBed.configureTestingModule({
            imports: [GamePageComponent],
            providers: [{ provide: GameService, useValue: mockedGameService }],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call refreshGame on ngOnInit', () => {
        component.ngOnInit();
        expect(mockedGameService.refreshGame).toHaveBeenCalled();
    });

    it('should toggle isQuitPopupVisible on handleQuitGame', () => {
        component.isQuitPopupVisible = false;
        component.handleQuitGame();
        expect(component.isQuitPopupVisible).toBeTrue();
    });

    it('should close popup and disconnect when confirm=true', () => {
        component.isQuitPopupVisible = true;
        component.closeQuitPopup(true);
        expect(component.isQuitPopupVisible).toBeFalse();
        expect(mockedGameService.disconnect).toHaveBeenCalled();
    });

    it('should close popup and not disconnect when confirm=false', () => {
        component.isQuitPopupVisible = true;
        component.closeQuitPopup(false);
        expect(component.isQuitPopupVisible).toBeFalse();
        expect(mockedGameService.disconnect).not.toHaveBeenCalled();
    });

    it('should handleTileLeftClick with PLAYER_IN_PROXIMITY', () => {
        const tile: TileBase = { type: TileType.Base, data: [TileData.PlayerInProximity] };
        component.handleTileLeftClick(tile);
        expect(mockedGameService.initiateCombat).toHaveBeenCalledWith(tile);
    });

    it('should handleTileLeftClick with DOOR_IN_PROXIMITY', () => {
        const tile: TileBase = { type: TileType.Base, data: [TileData.DoorInProximity] };
        component.handleTileLeftClick(tile);
        expect(mockedGameService.interactDoor).toHaveBeenCalledWith(tile);
    });

    it('should handleTileLeftClick with FASTEST_ROUTE', () => {
        const tile: TileBase = { type: TileType.Base, data: [TileData.FastestRoute] };
        component.handleTileLeftClick(tile);
        expect(mockedGameService.movePlayer).toHaveBeenCalledWith(tile);
    });

    it('should do nothing if handleTileLeftClick has no data', () => {
        const tile: TileBase = { type: TileType.Base };
        component.handleTileLeftClick(tile);
        expect(mockedGameService.initiateCombat).not.toHaveBeenCalled();
        expect(mockedGameService.interactDoor).not.toHaveBeenCalled();
        expect(mockedGameService.movePlayer).not.toHaveBeenCalled();
    });

    it('should return tile description with player name', () => {
        const tile: TileBase = { type: TileType.Base, player: mockedGame.players[0] };
        const description = component.getTileDescription(tile);
        expect(description).toContain('Joueur');
    });

    it('should return tile description with object name', () => {
        const tile: TileBase = { type: TileType.Base, object: { name: ObjectName.Bone } };
        const translation = translateObjectName(ObjectName.Bone);

        const description = component.getTileDescription(tile);
        expect(description).toContain(translation.toLowerCase());
    });

    it('should try to show fastest route', () => {
        const tile: TileBase = { type: TileType.Base, object: { name: ObjectName.Trex } };
        component.tryShowFastestRoute(tile);
        expect(mockedGameService.findFastestRoute).toHaveBeenCalledWith(tile);
    });

    it('should show fastest route if player has bird but not flag', () => {
        mockedGameService.currentPlayer.inventory = [{ name: ObjectName.Bird }];
        const result = component['playerHasBirdWithoutFlag']();
        expect(result).toEqual(true);
    });

    it('should return tile description with type only if no player or object', () => {
        const tile: TileBase = { type: TileType.Base };
        const description = component.getTileDescription(tile);
        expect(description).toContain(TYPE_TO_DESCRIPTION[TileType.Base]);
    });

    it('should set selectedTile to null by default', () => {
        expect(component.selectedTile).toBeNull();
    });

    it('should call movePlayer on handleTileRightClick if debugging is enabled', () => {
        mockedGame.data.debugging = true;
        component.handleTileRightClick({ type: TileType.Base, data: [TileData.Accessible] });

        expect(mockedGameService.movePlayer).toHaveBeenCalled();
    });

    it('should set selectedTile on handleTileRightClick if debugging is disabled', () => {
        mockedGame.data.debugging = false;
        const tile: TileBase = { type: TileType.Base, data: [] };

        component.handleTileRightClick(tile);

        expect(component.selectedTile).toBe(tile);
        expect(mockedGameService.movePlayer).not.toHaveBeenCalled();
    });

    it('should try to show fastest route ', () => {
        mockedGame.data.debugging = false;
        const tile: TileBase = { type: TileType.Base, data: [] };
        component.tryShowFastestRoute(tile);
        expect(mockedGameService.findFastestRoute).toHaveBeenCalled();
    });

    it('left click should do nothing if debugging is active', () => {
        mockedGame.data.debugging = true;
        const tile: TileBase = { type: TileType.Base, data: [] };
        component.handleTileLeftClick(tile);
        expect(mockedGameService.movePlayer).not.toHaveBeenCalled();
    });

    it('should call toggleDebugMode on key press "d"', () => {
        mockedGameService.toggleDebugMode = jasmine.createSpy('toggleDebugMode');
        const event = new KeyboardEvent('keydown', { key: 'd' });

        document.dispatchEvent(event);

        expect(mockedGameService.toggleDebugMode).toHaveBeenCalled();
    });

    it('should call toggleDebugMode on key press "D"', () => {
        mockedGameService.toggleDebugMode = jasmine.createSpy('toggleDebugMode');
        const event = new KeyboardEvent('keydown', { key: 'D' });

        document.dispatchEvent(event);

        expect(mockedGameService.toggleDebugMode).toHaveBeenCalled();
    });
});
