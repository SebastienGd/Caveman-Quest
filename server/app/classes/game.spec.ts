/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
import * as algorithms from '@app/utils/algorithms';
import { CombatEvent } from '@app/utils/constants/combat-events';
import { GameEvent } from '@app/utils/constants/game-events';
import { TimerEvent } from '@app/utils/constants/timer-events';
import * as gameChecks from '@app/utils/game-checks';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { GameMode } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { Player, PlayerData } from '@common/interfaces/player';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { Game } from './game';
import * as gameObjectsModule from './game-objects';

dotenv.config();
const serverRoot = process.cwd();
const map = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMap.json'), 'utf8'));
const mapCTF = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/gameMapCTF.json'), 'utf8'));

describe('Game', () => {
    let game: Game;
    let gameCTF: Game;
    let sandbox: sinon.SinonSandbox;
    let players: Player[];
    let player1: Player;
    let player2: Player;
    let player3: Player;
    let player4: Player;

    beforeEach(() => {
        player1 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player1.json'), 'utf8'));
        player2 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player2.json'), 'utf8'));
        player3 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player3.json'), 'utf8'));
        player4 = JSON.parse(readFileSync(path.join(serverRoot, './tests/players/player4.json'), 'utf8'));

        players = [player1, player2, player3, player4];
        sandbox = sinon.createSandbox();
        game = new Game(JSON.parse(JSON.stringify(map)), '1234', players);
        const ctfMap = JSON.parse(JSON.stringify(mapCTF));
        ctfMap.mode = GameMode.Ctf;
        gameCTF = new Game(ctfMap, '1234', JSON.parse(JSON.stringify(players)));
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('destroy', () => {
        it('should stop timer, destroy combat, remove listeners from map and game', () => {
            const stopSpy = sandbox.spy(game.timer, 'stop');
            const timerRemoveAllListenersSpy = sandbox.spy(game.timer, 'removeAllListeners');
            const combatDestroySpy = sandbox.spy(game.combat, 'destroy');
            const mapRemoveAllListenersSpy = sandbox.spy(game.map, 'removeAllListeners');
            const gameRemoveAllListenersSpy = sandbox.spy(game, 'removeAllListeners');

            game.destroy();

            expect(stopSpy.calledOnce).to.be.true;
            expect(timerRemoveAllListenersSpy.calledOnce).to.be.true;
            expect(combatDestroySpy.calledOnce).to.be.true;
            expect(mapRemoveAllListenersSpy.calledOnce).to.be.true;
            expect(gameRemoveAllListenersSpy.calledOnce).to.be.true;
        });
    });

    describe('constructor', () => {
        it('should initialize with correct properties', () => {
            expect(game.code).to.equal('1234');
            expect(game.players.length).to.equal(players.length);
            expect(game.map).to.be.instanceOf(EventEmitter);
            expect(game.timer).to.be.instanceOf(EventEmitter);
        });

        it('should spawn players at random spawn points', () => {
            const spawnPoints = game.map.tiles.flat().filter((tile) => tile?.object?.name === ObjectName.Spawnpoint);
            expect(spawnPoints.length).to.be.lessThanOrEqual(players.length);
        });

        it('should generate teams if mode is ctf', () => {
            expect(gameCTF.players[0].data.includes(PlayerData.RedTeam) || gameCTF.players[0].data.includes(PlayerData.BlueTeam)).to.equal(true);
        });
    });

    describe('disconnectPlayer', () => {
        it('should mark player as disconnected', () => {
            player2.data.push(PlayerData.Disconnected);
            player3.data.push(PlayerData.Disconnected);
            player4.data.push(PlayerData.Disconnected);
            game.disconnectPlayer(player1.id);
            return expect(player1.data.includes(PlayerData.Disconnected)).to.be.true;
        });
        it('should undo debugging if admin disconnected', () => {
            player1.data.push(PlayerData.Admin);
            game.data.debugging = true;
            game.disconnectPlayer(player1.id);
            return expect(player1.data.includes(PlayerData.Disconnected)).to.be.true && expect(game.data.debugging).to.be.false;
        });

        it('should end game if only one player remains', () => {
            const emitSpy = sandbox.spy(game, 'emit');
            game.emit(GameEvent.NewGame);
            game.disconnectPlayer(player2.id);
            game.disconnectPlayer(player1.id);
            game.disconnectPlayer(player3.id);

            return expect(emitSpy.calledWith(GameEvent.EndGame, null)).to.be.true;
        });

        it('should end turn if active player disconnects', () => {
            game.disconnectPlayer(game.activePlayer.player.id);
            return expect(game.data.turnIsEnding).to.be.true;
        });
    });
    describe('toGameBase', () => {
        it('should return a GameBase object with correct properties', () => {
            const gameBase = game.toGameBase();

            expect(gameBase).to.be.an('object');
            expect(gameBase).to.have.all.keys('map', 'players', 'code', 'data', 'stats');
        });
    });

    describe('endTurn', () => {
        it('should transition to next player', (done) => {
            game.movePath = [];
            game.on(GameEvent.NewTurn, () => {
                return expect(game.data.transitioning || game.data.turnIsEnding).to.be.true && done();
            });
            game.endTurn();
        });

        it('should not transition if already transitioning', () => {
            game.data.transitioning = true;
            const emitSpy = sandbox.spy(game, 'emit');
            game.endTurn();
            return expect(emitSpy.calledWith(GameEvent.NewTurn)).to.be.false;
        });
    });

    describe('movePlayer', () => {
        it('should create move path in debug mode', () => {
            game.data.debugging = true;
            const destination = { x: 5, y: 5 };
            game.movePlayer(destination);
            expect(game.movePath.length).to.equal(1);
        });

        it('should affect player movement opportunities with torch or bird objects', () => {
            const birdObject = gameObjectsModule.createObject({ name: ObjectName.Bird });
            birdObject.onMovePlayer = sinon.stub().returns(false);
            player1.inventory = [birdObject];
            game.activePlayer.player = player1;

            const startMovementSpy = sandbox.spy(game, 'startMovement');
            game.movePlayer({ x: 7, y: 7 });

            return expect(startMovementSpy.called).to.be.false;
        });

        it('should interact with door', () => {
            game.interactWithDoor({ x: 1, y: 1 }, { x: 2, y: 1 });

            const tryEndTurnSpy = sandbox.spy(game, 'endTurn');
            return expect(tryEndTurnSpy.called).to.be.false;
        });
    });

    describe('setDebugMode', () => {
        it('should toggle On debug mode', () => {
            game.setDebugMode(true);
            return expect(game.data.debugging).to.be.true;
        });
        it('should toggle Off debug mode', () => {
            game.setDebugMode(false);
            return expect(game.data.debugging).to.be.false;
        });

        it('should emit DebugModeChange event', () => {
            const emitSpy = sandbox.spy(game, 'emit');
            game.setDebugMode(true);
            return expect(emitSpy.calledWith(GameEvent.DebugModeChange)).to.be.true;
        });
    });

    describe('swapPlayerObject', () => {
        it('should not let the player drop an object if it is not part of its inventory', () => {
            sandbox.stub(algorithms, 'playerHasObject').returns(false);
            const emitSpy = sandbox.spy(game, 'emit');
            game.swapPlayerObject(ObjectName.Bird);
            return expect(emitSpy.calledWith(GameEvent.PickUpObject)).to.be.false;
        });

        it('should swap the player object with the one on the tile', () => {
            const objectToDropName = ObjectName.Steak;
            const steakDrop = gameObjectsModule.createObject({ name: ObjectName.Steak });
            const clubWeaponPick = gameObjectsModule.createObject({ name: ObjectName.ClubWeapon });

            player1.inventory = [steakDrop];
            game.activePlayer.player = player1;

            const tile = map.tiles[0][0];
            tile.object = clubWeaponPick;

            const temp = sandbox.stub(algorithms, 'findTile').returns(tile);
            const temp2 = sandbox.stub(algorithms, 'playerHasObject').returns(true);
            const temp3 = sandbox.stub(gameObjectsModule, 'createObject').returns(clubWeaponPick);
            const steakSpy = sinon.spy(steakDrop, 'applyEffect');
            const weaponSpy = sinon.spy(clubWeaponPick, 'applyEffect');
            const tryEndTurnSpy = sandbox.stub(gameChecks, 'isTurnDone').returns(false);

            game.swapPlayerObject(objectToDropName);
            temp.restore();
            temp2.restore();
            temp3.restore();
            steakSpy.restore();
            weaponSpy.restore();
            tryEndTurnSpy.restore();
            return (
                expect(steakSpy.calledWith(player1, false)).to.be.true &&
                expect(weaponSpy.calledWith(player1, true)).to.be.true &&
                expect(player1.inventory).to.deep.equal([clubWeaponPick]) &&
                expect(tile.object.name).to.equal(objectToDropName)
            );
        });
    });

    describe('timer events', () => {
        it('should end turn when timer expires', () => {
            const endTurnSpy = sandbox.spy(game, 'endTurn');
            game.timer.emit(TimerEvent.TimerExpired);
            return expect(endTurnSpy.called).to.be.true;
        });
    });

    describe('combat events', () => {
        let turnDoneSpy: sinon.SinonSpy;
        let respawnSpy: sinon.SinonStub;
        let emitSpy: sinon.SinonSpy;

        beforeEach(() => {
            emitSpy = sandbox.spy(game, 'emit');
            respawnSpy = sandbox.stub(algorithms, 'respawnPlayer');
        });

        afterEach(() => {
            turnDoneSpy?.restore();
            emitSpy.restore();
            respawnSpy.restore();
        });

        it('should pause timer when combat starts', () => {
            const pauseSpy = sandbox.spy(game.timer, 'pause');

            game.combat.activePlayer = player1;
            game.combat.inactivePlayer = player2;

            player1.stats = { ...player1.stats, combat: 0 };
            player2.stats = { ...player2.stats, combat: 0 };

            game.combat.emit(CombatEvent.CombatStart);

            expect(pauseSpy.called).to.be.true;
        });

        it('should handle combat end with final winner', () => {
            game.combat.activePlayer = game.activePlayer.player;
            game.activePlayer.player.stats.victories = 3;
            game.emit(GameEvent.NewGame);
            game.combat.emit(CombatEvent.CombatEnd, true);
            return expect(emitSpy.calledWith(GameEvent.EndGame)).to.be.true;
        });
        it('should handle combat when opponent escapes', () => {
            game.combat.activePlayer = game.activePlayer.player;
            game.combat.inactivePlayer = player3;
            game.activePlayer.player.stats.victories = 2;

            turnDoneSpy = sandbox.spy(gameChecks, 'isTurnDone');
            game.combat.emit(CombatEvent.CombatEnd, false);

            return expect(turnDoneSpy.called).to.be.true && expect(emitSpy.calledWith(GameEvent.UpdateAccessibleGame)).to.be.true;
        });

        it('should handle combat if we kill opponent', () => {
            game.combat.activePlayer = game.activePlayer.player;
            game.combat.inactivePlayer = player3;
            game.activePlayer.player.stats.victories = 2;

            game.combat.emit(CombatEvent.CombatEnd, true);

            return expect(respawnSpy.calledWith(player3, game)).to.be.true && expect(emitSpy.calledWith(GameEvent.UpdateAccessibleGame)).to.be.true;
        });

        it('should handle combat if opponent kills us', () => {
            game.combat.activePlayer = player3;
            game.combat.inactivePlayer = game.activePlayer.player;
            game.activePlayer.player.stats.victories = 2;

            game.combat.emit(CombatEvent.CombatEnd, true);

            return expect(respawnSpy.calledWith(game.activePlayer.player, game)).to.be.true && expect(game.data.turnIsEnding).to.be.true;
        });

        it('should handle combat if we escape', () => {
            game.combat.activePlayer = player3;
            game.combat.inactivePlayer = game.activePlayer.player;

            game.combat.emit(CombatEvent.CombatEnd, false);

            return expect(emitSpy.calledWith(GameEvent.UpdateAccessibleGame)).to.be.true && expect(respawnSpy.called).to.be.false;
        });

        it('should EndGameCTF when CTF game is over', () => {
            const stub = sandbox.stub(gameChecks, 'isGameOver').returns(true);
            gameCTF.players.forEach((p) => algorithms.removePlayerData(p, [PlayerData.RedTeam, PlayerData.BlueTeam]));
            gameCTF.activePlayer.player.data.push(PlayerData.RedTeam);
            gameCTF.players.forEach((p) => {
                if (!p.data.includes(PlayerData.RedTeam)) p.data.push(PlayerData.BlueTeam);
            });
            const result = gameCTF['tryEndGame']();
            stub.restore();
            return expect(result).to.be.true;
        });
    });

    describe('private methods', () => {
        it('should generate valid turn order', () => {
            const fastPlayer = { ...player1, attributes: { ...player1.attributes, speed: 5 } };
            game.players = [player2, fastPlayer];
            game['generateTurnOrder']();
            expect(game.players[0]).to.equal(fastPlayer);
        });

        it('should find player by id', () => {
            const foundPlayer = game.findPlayer(player1.id);
            expect(foundPlayer).to.equal(player1);
        });

        it('genereateTeams', () => {
            game['generateTeams']();
            expect(player1.data.includes(PlayerData.RedTeam) || player1.data.includes(PlayerData.BlueTeam)).to.equal(true);
        });

        it('should endTurn when TryEndTurn', () => {
            sandbox.stub(gameChecks, 'isTurnDone').returns(true);
            game['tryEndTurn']();
            expect(game.data.turnIsEnding).to.equal(true);
        });

        it('should return null when all players are disconnected', () => {
            game.players.forEach((player) => {
                player.data.push(PlayerData.Disconnected);
            });

            const nextPlayer = game['getNextPlayer']();
            return expect(nextPlayer).to.be.null;
        });

        it('should not pick spawnpoint object', () => {
            const emitSpy = sandbox.spy(game, 'emit');
            game['pickUpNewObject'](ObjectName.Spawnpoint);
            return expect(emitSpy.calledWith(GameEvent.UpdateAccessibleGame)).to.be.false;
        });

        it('should emit ManagePlayerInventory if inventory is full', () => {
            const steakObject = gameObjectsModule.createObject({ name: ObjectName.Steak });
            const trexObject = gameObjectsModule.createObject({ name: ObjectName.Trex });
            const clubWeaponObject = gameObjectsModule.createObject({ name: ObjectName.ClubWeapon });
            player1.inventory = [steakObject, trexObject];
            game.activePlayer.player = player1;

            const tile = map.tiles[0][0];
            tile.object = clubWeaponObject;
            const temp = sandbox.stub(algorithms, 'findTile').returns(tile);
            const temp2 = sandbox.stub(gameObjectsModule, 'createObject').returns(clubWeaponObject);

            const emitSpy = sandbox.spy(game, 'emit');

            game['pickUpNewObject'](ObjectName.ClubWeapon);
            temp.restore();
            temp2.restore();
            return expect(game.data.isSelectingObject).to.be.true && expect(emitSpy.calledWith(GameRoomEvent.ManagePlayerInventory)).to.be.true;
        });

        it('should add picked object to player inventory', () => {
            const steakObject = gameObjectsModule.createObject({ name: ObjectName.Steak });
            const clubWeaponPick = gameObjectsModule.createObject({ name: ObjectName.ClubWeapon });
            player1.inventory = [steakObject];
            game.activePlayer.player = player1;

            const tile = map.tiles[0][0];
            tile.object = clubWeaponPick;
            const temp = sandbox.stub(algorithms, 'findTile').returns(tile);
            sandbox.stub(gameObjectsModule, 'createObject').returns(clubWeaponPick);
            const weaponSpy = sinon.spy(clubWeaponPick, 'applyEffect');
            const tryEndTurnSpy = sandbox.stub(gameChecks, 'isTurnDone').returns(false);

            game['pickUpNewObject'](ObjectName.ClubWeapon);
            temp.restore();
            weaponSpy.restore();
            tryEndTurnSpy.restore();
            return (
                expect(player1.inventory).to.deep.equal([steakObject, clubWeaponPick]) &&
                expect(weaponSpy.calledWith(player1, true)).to.be.true &&
                expect(tile.object).to.be.undefined
            );
        });
    });
});
