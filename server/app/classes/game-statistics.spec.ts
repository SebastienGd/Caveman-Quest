/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as gameMapUtils from '@app/utils/algorithms';
import { CombatEvent } from '@app/utils/constants/combat-events';
import { GameEvent } from '@app/utils/constants/game-events';
import { GameMapEvent } from '@app/utils/constants/map-events';
import { TileBase, TileType } from '@common/interfaces/map';
import { GameObject, ObjectName } from '@common/interfaces/object';
import { Player } from '@common/interfaces/player';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import * as sinon from 'sinon';
import { GameStatistics } from './game-statistics';

describe('GameStatistics', () => {
    let gameMock: any;
    let player: Player;
    let doorTile: TileBase;
    let walkableTile: TileBase;

    beforeEach(() => {
        doorTile = { type: TileType.ClosedDoor };
        walkableTile = { type: TileType.Base };

        player = {
            id: 'player1',
            name: 'Player1',
            avatar: '',
            movesLeft: 0,
            diceResult: 0,
            actionsLeft: 0,
            evasionAttempts: 0,
            data: [],
            attributes: {
                currentHealth: 10,
                health: 10,
                speed: 3,
                attack: { value: 1, dice: null },
                defense: { value: 1, dice: null },
            },
            stats: {
                victories: 0,
                defeats: 0,
                evasions: 0,
                combat: 0,
                lostHP: 0,
                damageDone: 0,
                nbrOfPickedUpObjects: 0,
                tilesVisitedPercentage: 0,
            },
            inventory: [],
            spawnPoint: { x: 0, y: 0 },
        };

        const mapTiles = [
            [{ ...walkableTile }, { ...walkableTile }],
            [{ ...doorTile }, { ...walkableTile }],
        ];

        gameMock = Object.assign(new EventEmitter(), {
            players: [player],
            map: Object.assign(new EventEmitter(), {
                tiles: mapTiles,
            }),
            combat: Object.assign(new EventEmitter(), {
                activePlayer: player,
                inactivePlayer: player,
            }),
            code: 'room1',
            data: { debugging: false, transitioning: false, turnIsEnding: false, gameIsOver: false },
            stats: {
                duration: 0,
                nbTurns: 0,
                doorInteractedPercentage: 0,
                tilesVisitedPercentage: 0,
                nbPlayersHeldFlag: 0,
            },
        });
    });

    it('should initialize statistics and attach handlers', () => {
        const spy = sinon.spy(gameMock, 'on');
        new GameStatistics(gameMock);
        expect(spy.callCount).to.be.greaterThan(0);
    });

    it('should initialize duration when NewGame and update it at EndGame', () => {
        const clock = sinon.useFakeTimers();

        new GameStatistics(gameMock);
        gameMock.emit(GameEvent.NewGame);

        clock.tick(5000);
        gameMock.emit(GameEvent.EndGame);

        expect(gameMock.stats.duration).to.equal(5);
        clock.restore();
    });

    it('should initialize duration and nbTurns when EndGameCTF', () => {
        const clock = sinon.useFakeTimers();

        new GameStatistics(gameMock);
        gameMock.emit(GameEvent.NewGame);

        clock.tick(7000);
        gameMock.emit(GameEvent.EndGameCTF, [player]);

        expect(gameMock.stats.duration).to.equal(7);
        expect(gameMock.stats.nbTurns).to.equal(1);

        clock.restore();
    });

    it('should count a new turn', () => {
        new GameStatistics(gameMock);
        gameMock.emit(GameEvent.NewTurn);
        expect(gameMock.stats.nbTurns).to.equal(1);
    });

    it('should update visited tile stats correctly', () => {
        new GameStatistics(gameMock);
        const movement = {
            start: { type: TileType.Base },
            destination: { x: 1, y: 1 },
        };
        const temp = sinon.stub(gameMapUtils, 'findTile').returns(walkableTile);
        gameMock.activePlayer = { player };
        gameMock.emit(GameEvent.MovePlayer, movement);
        temp.restore();
        expect(player.stats.tilesVisitedPercentage).to.be.greaterThan(0);
    });

    it('should register door interaction once', () => {
        new GameStatistics(gameMock);
        gameMock.map.emit(GameMapEvent.DoorInteraction, doorTile);
        expect(gameMock.stats.doorInteractedPercentage).to.be.greaterThan(0);
    });

    it('should not register duplicate door interaction', () => {
        new GameStatistics(gameMock);
        gameMock.map.emit(GameMapEvent.DoorInteraction, doorTile);
        gameMock.map.emit(GameMapEvent.DoorInteraction, doorTile);
        expect(gameMock.stats.doorInteractedPercentage).to.be.greaterThan(0);
    });

    it('should update picked up objects and flag count', () => {
        new GameStatistics(gameMock);
        const flag: GameObject = { name: ObjectName.Flag };
        gameMock.activePlayer = { player };

        gameMock.emit(GameEvent.PickUpObject, flag);
        expect(player.stats.nbrOfPickedUpObjects).to.equal(1);
    });

    it('should ignore duplicate picked up objects', () => {
        new GameStatistics(gameMock);
        const obj: GameObject = { name: ObjectName.Torch };
        gameMock.activePlayer = { player };
        gameMock.emit(GameEvent.PickUpObject, obj);
        gameMock.emit(GameEvent.PickUpObject, obj);
        expect(player.stats.nbrOfPickedUpObjects).to.equal(1);
    });

    it('should count combat start stats', () => {
        const otherPlayer = structuredClone(player);
        otherPlayer.id = 'other';
        gameMock.combat.inactivePlayer = otherPlayer;

        new GameStatistics(gameMock);
        gameMock.combat.emit(CombatEvent.CombatStart);

        expect(player.stats.combat).to.equal(1);
        expect(otherPlayer.stats.combat).to.equal(1);
    });

    it('should update attack stats', () => {
        new GameStatistics(gameMock);
        gameMock.combat.emit(CombatEvent.SuccessfulAttack, 3);
        expect(player.stats.damageDone).to.equal(3);
        expect(player.stats.lostHP).to.equal(3);
    });

    it('should update combat end stats: won = true', () => {
        new GameStatistics(gameMock);
        gameMock.combat.emit(CombatEvent.ProcessingCombatEnd, true);
        expect(player.stats.victories).to.equal(1);
    });

    it('should update combat end stats: won = false', () => {
        new GameStatistics(gameMock);
        gameMock.combat.emit(CombatEvent.ProcessingCombatEnd, false);
        expect(player.stats.evasions).to.equal(1);
    });

    it('should not crash if EndGame is emitted without startTime being set', () => {
        new GameStatistics(gameMock);
        gameMock.emit(GameEvent.EndGame);
        expect(gameMock.stats.duration).to.equal(0);
    });
});
