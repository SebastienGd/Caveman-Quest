import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryChoiceComponent } from './inventory-choice.component';
import { ButtonComponent } from '@app/components/button/button.component';
import { TileType } from '@common/interfaces/map';
import { GameObject, ObjectName } from '@common/interfaces/object';
import { GameService } from '@app/services/game.service';
import { Player, PlayerAttributes, PlayerStats } from '@common/interfaces/player';

describe('InventoryChoiceComponent', () => {
    let component: InventoryChoiceComponent;
    let fixture: ComponentFixture<InventoryChoiceComponent>;
    let gameServiceMock: jasmine.SpyObj<GameService>;
    let object: GameObject;

    const mockPlayer: Player = {
        id: 'player1',
        name: 'TestPlayer',
        avatar: 'avatar1',
        stats: {} as unknown as PlayerStats,
        diceResult: 4,
        movesLeft: 0,
        actionsLeft: 0,
        attributes: {} as unknown as PlayerAttributes,
        inventory: [],
        data: [],
    };

    beforeEach(async () => {
        gameServiceMock = jasmine.createSpyObj<GameService>('GameService', ['selectObject', 'isInventoryPopupVisible']);

        await TestBed.configureTestingModule({
            imports: [InventoryChoiceComponent, ButtonComponent],
            providers: [{ provide: GameService, useValue: gameServiceMock }],
        }).compileComponents();

        fixture = TestBed.createComponent(InventoryChoiceComponent);
        component = fixture.componentInstance;

        object = { name: ObjectName.Random };
        component.tile = { type: TileType.Base, player: mockPlayer, object };

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should not create if tile does not have player or object', () => {
        component.tile.player = undefined;
        component.tile.object = undefined;
        component.ngOnInit();
        expect(gameServiceMock.selectObject).not.toHaveBeenCalled();
    });

    it('should not proceed if tile does not have player or object', () => {
        component.tile.player = undefined;
        component.tile.object = undefined;
        component.manageInventory(object);
        expect(gameServiceMock.selectObject).not.toHaveBeenCalled();
    });

    it('should call selectObject with the object name', () => {
        component.manageInventory(object);
        expect(gameServiceMock.selectObject).toHaveBeenCalledWith(object.name);
    });

    it('should change inventory popup visibility', () => {
        component.manageInventory(object);
        expect(gameServiceMock.isInventoryPopupVisible).toBe(false);
    });
});
