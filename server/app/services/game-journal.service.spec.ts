/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-unused-vars */
import { Game } from '@app/classes/game';
import * as algorithms from '@app/utils/algorithms';
import { CombatEvent } from '@app/utils/constants/combat-events';
import { GameEvent } from '@app/utils/constants/game-events';
import { GameMapEvent } from '@app/utils/constants/map-events';
import { JournalMessage } from '@common/interfaces/journal-message';
import { TileBase, TileType } from '@common/interfaces/map';
import { GameObject, ObjectName } from '@common/interfaces/object';
import { Dice, Player, PlayerData } from '@common/interfaces/player';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import * as sinon from 'sinon';
import { GameJournalService } from './game-journal.service';
import { GameSocketService } from './game-socket.service';
import { RouteManager } from './routes-manager';

describe('GameJournalService', () => {
    let gameSocketServiceMock: sinon.SinonStubbedInstance<GameSocketService>;
    let routeManagerMock: sinon.SinonStubbedInstance<RouteManager>;
    let game: Partial<Game> & EventEmitter;
    let sandbox: sinon.SinonSandbox;

    const mockPlayer: Player = {
        id: '1',
        name: 'Alice',
        avatar: 'img.png',
        data: [],
        movesLeft: 3,
        diceResult: 4,
        actionsLeft: 1,
        attributes: {
            currentHealth: 10,
            health: 10,
            speed: 5,
            attack: { value: 2, dice: Dice.Dice6 },
            defense: { value: 1, dice: Dice.Dice4 },
        },
        stats: {
            victories: 3,
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
        evasionAttempts: 0,
    };

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        gameSocketServiceMock = sandbox.createStubInstance(GameSocketService);
        routeManagerMock = sandbox.createStubInstance(RouteManager);

        const activePlayer: Player = { ...mockPlayer, name: 'Alice', id: '1', data: [] };
        const inactivePlayer: Player = { ...mockPlayer, name: 'Bob', id: '2', data: [PlayerData.Combat] };

        game = new EventEmitter() as Partial<Game> & EventEmitter;
        Object.assign(game, {
            code: '1234',
            players: [activePlayer, inactivePlayer],
            data: { debugging: false },
            map: new EventEmitter(),
            combat: new EventEmitter(),
        });

        Object.setPrototypeOf(game, EventEmitter.prototype);
        Object.setPrototypeOf(game.map, EventEmitter.prototype);
        Object.setPrototypeOf(game.combat, EventEmitter.prototype);

        game.activePlayer = { player: activePlayer, position: { x: 0, y: 0 } };
        game.combat.activePlayer = activePlayer;
        game.combat.inactivePlayer = inactivePlayer;

        gameSocketServiceMock.on.callsFake((event: string, callback: (...args: unknown[]) => void) => {
            if (event === GameEvent.NewGame) callback(game as Game);
            return gameSocketServiceMock;
        });

        new GameJournalService(gameSocketServiceMock as unknown as GameSocketService, routeManagerMock as unknown as RouteManager);
        game.emit(GameEvent.NewGame, game);
    });

    afterEach(() => sandbox.restore());

    it('should log new turn', () => {
        game.emit(GameEvent.NewTurn, game.activePlayer.player);
        const msg = routeManagerMock.broadcastToGameRoom.firstCall.args[2] as JournalMessage;
        expect(msg.content).to.include('commence');
    });

    it('should log disconnect', () => {
        game.emit(GameEvent.Disconnect, mockPlayer);

        const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;

        expect(msg.content).to.include('Alice');
        expect(msg.content).to.include('a quitté la partie');
    });

    it('should log door interaction', () => {
        sandbox.stub(algorithms, 'findTileCoordinates').returns({ x: 3, y: 7 });
        const door: TileBase = { type: TileType.OpenedDoor } as TileBase;

        game.map.emit(GameMapEvent.DoorInteraction, door);

        const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;

        expect(msg.content).to.include('ouvert');
        expect(msg.content).to.include('(3, 7)');
    });

    it('should log debug mode toggle', () => {
        game.data.debugging = true;
        game.emit(GameEvent.DebugModeChange);

        const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;

        expect(msg.content).to.include('activé');
    });

    it('should log end game winner', () => {
        game.emit(GameEvent.EndGame);

        const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;

        expect(msg.content).to.include('Alice');
    });

    it('should log combat start', () => {
        game.combat.emit(CombatEvent.CombatStart);

        const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;

        expect(msg.content).to.include('Alice');
        expect(msg.content).to.include('Bob');
        expect(msg.content).to.include('combat');
    });

    it('should log attack result when success', () => {
        game.combat.activePlayer.diceResult = 6;
        game.combat.inactivePlayer.diceResult = 3;
        game.combat.emit(CombatEvent.AttackResult, 8, 5, 3);

        const msg = routeManagerMock.broadcastTo.firstCall.args[3] as JournalMessage;

        expect(msg.content).to.include('attaque');
        expect(msg.content).to.include('Résultat: 3');
    });

    it('should log attack result when failure', () => {
        game.combat.activePlayer.diceResult = 6;
        game.combat.inactivePlayer.diceResult = 3;
        game.combat.emit(CombatEvent.AttackResult, 5, 8, 0);

        const msg = routeManagerMock.broadcastTo.firstCall.args[3] as JournalMessage;

        expect(msg.content).to.include('attaque');
        expect(msg.content).to.include('Échec');
    });

    it('should log evade result when success', () => {
        game.combat.emit(CombatEvent.EvadeResult, 0.21, true);

        const msg = routeManagerMock.broadcastTo.firstCall.args[3] as JournalMessage;

        expect(msg.content).to.include('évasion');
        expect(msg.content).to.include('✅');
    });

    it('should log evade result when failure', () => {
        game.combat.emit(CombatEvent.EvadeResult, 0.5, false);

        const msg = routeManagerMock.broadcastTo.firstCall.args[3] as JournalMessage;

        expect(msg.content).to.include('évasion');
        expect(msg.content).to.include('❌');
    });

    it('should log combat end (win)', () => {
        game.combat.emit(CombatEvent.CombatEnd, true);

        const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;

        expect(msg.content).to.include('combat');
        expect(msg.content).to.include('Alice');
    });

    it('should log combat end (evade)', () => {
        game.combat.emit(CombatEvent.CombatEnd, false);

        const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;

        expect(msg.content).to.include('combat');
        expect(msg.content).to.include('Alice');
    });

    it('should return early if player is undefined on disconnect', () => {
        const callCountBefore = routeManagerMock.broadcastToGameRoom.callCount;

        game.emit(GameEvent.Disconnect, undefined);

        expect(routeManagerMock.broadcastToGameRoom.callCount).to.equal(callCountBefore);
    });

    it('should broadcast to game room if toCombatPlayersOnly is false', () => {
        game.emit(GameEvent.NewTurn, game.activePlayer.player);
        expect(routeManagerMock.broadcastToGameRoom.called).to.be.true;
    });

    it('should log door interaction for a closed door', () => {
        sandbox.stub(algorithms, 'findTileCoordinates').returns({ x: 1, y: 1 });
        const door: TileBase = { type: TileType.ClosedDoor } as TileBase;
        game.map.emit(GameMapEvent.DoorInteraction, door);

        const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;

        expect(msg.content).to.include('fermé');
        expect(msg.content).to.include('(1, 1)');
    });

    it('should log debug mode OFF when debugging is false', () => {
        game.data.debugging = false;
        game.emit(GameEvent.DebugModeChange);

        const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;

        expect(msg.content).to.include('désactivé');
    });

    it('should handle end game even if no player meets the victory condition', (done) => {
        game.players = [{ ...mockPlayer, stats: { ...mockPlayer.stats, victories: 0 } }];
        game.emit(GameEvent.EndGame);

        setTimeout(() => {
            const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;
            expect(msg.content).to.include('Liste de joueurs actifs');
            done();
        }, 10);
    });

    it('should log end game CTF winners', (done) => {
        const winners = [
            { ...mockPlayer, name: 'Alice' },
            { ...mockPlayer, name: 'Bob' },
        ];
        game.emit(GameEvent.EndGameCTF, winners);

        setTimeout(() => {
            const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;
            expect(msg.content).to.include('Alice');
            expect(msg.content).to.include('Bob');
            done();
        }, 10);
    });

    it('should log pick up flag', () => {
        const flag = { name: ObjectName.Flag } as GameObject;
        game.emit(GameEvent.PickUpObject, flag);

        const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;

        expect(msg.content).to.include('drapeau');
    });

    it('should log pick up object', () => {
        const steak = { name: ObjectName.Steak } as GameObject;
        game.emit(GameEvent.PickUpObject, steak);

        const msg = routeManagerMock.broadcastToGameRoom.getCall(routeManagerMock.broadcastToGameRoom.callCount - 1).args[2] as JournalMessage;

        expect(msg.content.toLowerCase()).to.include('steak');
    });
});
