/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { RoomEvent } from '@common/constants/room-events';
import { GameBase } from '@common/interfaces/game';
import { TileBase, TileData, TileType } from '@common/interfaces/map';
import { Player, PlayerData } from '@common/interfaces/player';
import { Subject } from 'rxjs';
import { mockGame } from 'src/tests/mock-game';
import { mockPlayers } from 'src/tests/mock-players';
import { GameAlgorithmsService } from './game-algorithms.service';
import { GameService } from './game.service';
import { SocketClientService } from './socket-client.service';
import { ObjectName } from '@common/interfaces/object';

describe('GameService', () => {
    let service: GameService;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;
    let mockAlgorithmsService: jasmine.SpyObj<GameAlgorithmsService>;
    let mockedGame: GameBase;
    let mockedPlayer: Player;
    let mockedOpponent: Player;

    const TIME = 30;

    beforeEach(() => {
        mockedPlayer = JSON.parse(JSON.stringify(mockPlayers[0]));
        mockedOpponent = JSON.parse(JSON.stringify(mockPlayers[1]));
        mockedGame = JSON.parse(JSON.stringify(mockGame));
        mockSocketClientService = jasmine.createSpyObj('SocketClientService', ['on', 'send'], { socket: jasmine.createSpyObj('Socket', ['emit']) });
        mockSocketClientService.send.and.callThrough();
        mockAlgorithmsService = jasmine.createSpyObj('AlgorithmsService', ['findTilePosition', 'findTileFromPosition', 'dijkstra']);

        TestBed.configureTestingModule({
            providers: [
                GameService,
                { provide: SocketClientService, useValue: mockSocketClientService },
                { provide: GameAlgorithmsService, useValue: mockAlgorithmsService },
            ],
        });

        service = TestBed.inject(GameService);
        service.localGame.set(mockedGame);
        mockSocketClientService.socket.id = 'player-1';
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Socket Configuration', () => {
        it('should listen for updateGame and update the game state', () => {
            const updateGameSubject = new Subject<GameBase>();

            mockSocketClientService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'updateGame') {
                    updateGameSubject.subscribe(callback as (data: GameBase) => void);
                }
            });
            (service as any).configureRoutesToServerSocket();
            const updatedGame = { ...mockedGame, data: { ...mockedGame.data, debugging: true } };
            updateGameSubject.next(updatedGame);

            expect(service.localGame().data.debugging).toBeTrue();
        });

        it('should update timer on timerValue event', () => {
            mockSocketClientService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'timerValue') {
                    callback(TIME as T);
                }
            });

            (service as any).configureRoutesToServerSocket();
            expect(service.currentTime).toBe(TIME);
        });

        it('should update the visibility of the inventory popup', () => {
            service.isInventoryPopupVisible = false;
            mockSocketClientService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'managePlayerInventory') {
                    callback({} as T);
                }
            });
            (service as any).configureRoutesToServerSocket();
            expect(service.isInventoryPopupVisible).toBeTrue();
        });
    });

    describe('Player Actions', () => {
        it('should call send ToggleDebugMode if currentPlayer is ADMIN', () => {
            service.currentPlayer = {
                ...mockedPlayer,
                data: [PlayerData.Admin],
            };
            service.toggleDebugMode();
            expect(mockSocketClientService.send).toHaveBeenCalledWith('toggleDebugMode');
        });

        it('should refresh the game', () => {
            service.refreshGame();
            expect(mockSocketClientService.send).toHaveBeenCalledWith('updateGame');
        });

        it('should quit the player', () => {
            service.disconnect();
            expect(mockSocketClientService.send).toHaveBeenCalledWith(RoomEvent.Quit);
        });

        it('should handle turn end', () => {
            service.handleTurnEnd();
            expect(mockSocketClientService.send).toHaveBeenCalledWith('endTurn');
        });

        it('should move player', () => {
            const destinationTile = mockedGame.map.tiles[2][2];
            mockAlgorithmsService.findTilePosition.and.returnValue({ x: 2, y: 2 });

            service.movePlayer(destinationTile);
            expect(mockSocketClientService.send).toHaveBeenCalledWith('movePlayer', { x: 2, y: 2 });
        });

        it('should find entities at proximity', () => {
            service.findEntitiesAtProximity();
            expect(mockSocketClientService.send).toHaveBeenCalledWith('findEntitiesAtProximity');
        });
        it('should refresh game when entities at proximity is already activated', () => {
            mockedGame.map.tiles[0][0].data = [TileData.DoorInProximity];
            service.localGame.set(mockedGame);
            service.findEntitiesAtProximity();
            expect(mockSocketClientService.send).toHaveBeenCalledWith(GameRoomEvent.UpdateGame);
        });

        it('should initiate combat if opponentTile has a player', () => {
            const opponentTile: TileBase = {
                type: TileType.Base,
                player: mockedOpponent,
                data: [],
            };
            service.initiateCombat(opponentTile);
            expect(mockSocketClientService.send).toHaveBeenCalledWith('initiateCombat', mockedOpponent.id);
        });

        it('should not initiate combat if opponentTile has no player', () => {
            const opponentTile = { player: undefined } as TileBase;
            service.initiateCombat(opponentTile);
            expect(mockSocketClientService.send).not.toHaveBeenCalledWith('initiateCombat', jasmine.anything());
        });

        it('should perform evade action', () => {
            service.evadeAction();
            expect(mockSocketClientService.send).toHaveBeenCalledWith('evadeAction');
        });

        it('should perform attack action', () => {
            service.attackAction();
            expect(mockSocketClientService.send).toHaveBeenCalledWith('attackAction');
        });

        it('should perform select object action', () => {
            const objectName = ObjectName.Random;
            service.selectObject(objectName);
            expect(mockSocketClientService.send).toHaveBeenCalledWith(GameRoomEvent.SelectObject, objectName);
        });

        it('should call singleTileMove when movePlayer event is received', () => {
            const moveData = {
                start: { x: 1, y: 1 },
                destination: { x: 2, y: 2 },
            };
            const singleTileMoveSpy = spyOn<any>(service, 'singleTileMove');
            mockSocketClientService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'movePlayer') {
                    callback(moveData as T);
                }
            });
            (service as any).configureRoutesToServerSocket();
            expect(singleTileMoveSpy).toHaveBeenCalledWith(moveData.start, moveData.destination);
        });

        it('should perform single tile move and decrease movesLeft if player is the currentPlayer', () => {
            const startPos = { x: 1, y: 1 };
            const endPos = { x: 2, y: 2 };

            const startTile: TileBase = {
                type: TileType.Base,
                player: mockedPlayer,
                data: [],
            };

            const destinationTile: TileBase = {
                type: TileType.Base,
                player: mockedPlayer,
                data: [],
            };

            service.currentPlayer = mockedPlayer;

            mockAlgorithmsService.findTileFromPosition.withArgs(mockedGame.map, startPos).and.returnValue(startTile);
            mockAlgorithmsService.findTileFromPosition.withArgs(mockedGame.map, endPos).and.returnValue(destinationTile);

            (service as any).singleTileMove(startPos, endPos);

            expect(destinationTile.player).toEqual(mockedPlayer);
            expect(startTile.player).toBeUndefined();
            const player = service.localGame().players.find((p) => p.id === destinationTile.player?.id);
            expect(player).not.toBeUndefined();
            expect(player?.movesLeft).toBe(mockedPlayer.movesLeft - 1);
        });

        it('should not decrease movesLeft if destination player is not currentPlayer', () => {
            const expectedMovesLeft = 5;
            const startPos = { x: 1, y: 1 };
            const endPos = { x: 2, y: 2 };

            const startTile: TileBase = {
                type: TileType.Base,
                player: mockedPlayer,
                data: [],
            };

            const destinationTile: TileBase = {
                type: TileType.Base,
                player: undefined,
                data: [],
            };

            service.currentPlayer = mockedPlayer;
            service.currentPlayer.movesLeft = 5;

            mockAlgorithmsService.findTileFromPosition.withArgs(mockedGame.map, startPos).and.returnValue(startTile);
            mockAlgorithmsService.findTileFromPosition.withArgs(mockedGame.map, endPos).and.returnValue(destinationTile);

            (service as any).singleTileMove(startPos, endPos);

            expect(service.currentPlayer.movesLeft).toBe(expectedMovesLeft);
        });
    });

    describe('Finding Players', () => {
        it('should find a player with specific data', () => {
            const foundPlayer = service.findPlayer([PlayerData.Active]);
            const disconnectedPlayer = service.findPlayer([PlayerData.Disconnected]);
            expect(foundPlayer?.id).toBe('player-1');
            expect(disconnectedPlayer?.id).toBe('player-2');
        });
    });

    describe('Updating Players and Tiles', () => {
        beforeEach(() => {
            (service as any).updatePlayer();
        });

        it('should set currentTile if currentPlayer has ACTIVE data', () => {
            service.currentPlayer = {
                ...mockedPlayer,
                id: 'player-1',
                data: [PlayerData.Active],
            };
            mockedGame.map.tiles[1][1].player = service.currentPlayer;
            service.localGame.set(mockedGame);
            (service as any).findCurrentTile();
            expect(service.currentTile).toBe(mockedGame.map.tiles[1][1]);
        });

        it('should disconnect if updated player is not found in updatePlayer()', () => {
            service.localGame.set({ ...mockedGame, players: [] });
            const disconnectSpy = spyOn(service, 'disconnect');
            (service as any).updatePlayer();
            expect(disconnectSpy).toHaveBeenCalled();
        });

        it('should update the current player to RAMI', () => {
            spyOn(service, 'disconnect');
            (service as any).updatePlayer();

            expect(service.currentPlayer.id).toBe('player-1');
            expect(service.currentPlayer.name).toBe('RAMI');
        });

        it('should update the opponent player to SEB', () => {
            service.currentPlayer = {
                ...mockedPlayer,
                id: 'player-1',
                data: [PlayerData.Active, PlayerData.Combat],
            };
            service.localGame.set(mockedGame);
            (service as any).updateOpponentPlayer();
            expect(service.opponentPlayer.id).toBe('player-3');
        });

        it('should find the current tile where RAMI is located', () => {
            (service as any).findCurrentTile();

            expect(service.currentTile).toBeDefined();
            expect(service.currentTile?.player?.id).toBe('player-1');
        });
    });

    describe('Handling Tile Interactions', () => {
        it('should interact with a door', () => {
            const doorTile = {} as TileBase;
            mockAlgorithmsService.findTilePosition.and.returnValue({ x: 1, y: 1 });

            service.interactDoor(doorTile);
            expect(mockSocketClientService.send).toHaveBeenCalledWith('interactWithDoor', { x: 1, y: 1 });
        });

        it('should NOT mark fastest route if cost is higher than currentPlayer.movesLeft', () => {
            const tile1: TileBase = { type: TileType.Base, data: [] };
            const tile2: TileBase = { type: TileType.Base, data: [] };

            mockAlgorithmsService.dijkstra.and.returnValue([
                { tile: tile1, cost: 5, x: 0, y: 0 },
                { tile: tile2, cost: 10, x: 1, y: 0 },
            ]);

            service.currentPlayer = { ...mockedPlayer, movesLeft: 5 };
            service.currentTile = mockedGame.map.tiles[0][0];
            service.findFastestRoute(tile2);

            expect(tile1.data).not.toContain(TileData.FastestRoute);
            expect(tile2.data).not.toContain(TileData.FastestRoute);
        });

        it('should mark fastest route if cost is 0 (Ice Tiles)', () => {
            const tile1: TileBase = { type: TileType.Ice, data: [TileData.Accessible] };
            const tile2: TileBase = { type: TileType.Ice, data: [TileData.Accessible] };

            mockAlgorithmsService.dijkstra.and.returnValue([
                { tile: tile2, cost: 0, x: 1, y: 0 },
                { tile: tile1, cost: 0, x: 1, y: 0 },
            ]);

            service.currentPlayer = { ...mockedPlayer, movesLeft: 5 };
            service.currentTile = mockedGame.map.tiles[0][0];
            service.findFastestRoute(tile2);

            expect(tile1.data).toContain(TileData.FastestRoute);
            expect(tile2.data).toContain(TileData.FastestRoute);
        });

        it('should mark tiles with fastest route if within move range', () => {
            mockAlgorithmsService.dijkstra.and.returnValue([
                { tile: mockedGame.map.tiles[0][0], cost: 3, x: 0, y: 0 },
                { tile: mockedGame.map.tiles[0][1], cost: 5, x: 1, y: 0 },
            ]);
            mockedGame.map.tiles[0][1].data = [TileData.Accessible];

            service.currentPlayer = mockedPlayer;
            service.currentTile = mockedGame.map.tiles[0][0];
            service.findFastestRoute(mockedGame.map.tiles[0][1]);

            expect(mockedGame.map.tiles[0][0].data).toContain(TileData.FastestRoute);
            expect(mockedGame.map.tiles[0][1].data).toContain(TileData.FastestRoute);
        });

        it('should not mark tiles with fastest route if not accessible', () => {
            mockAlgorithmsService.dijkstra.and.returnValue([
                { tile: mockedGame.map.tiles[0][0], cost: 3, x: 0, y: 0 },
                { tile: mockedGame.map.tiles[0][1], cost: 5, x: 1, y: 0 },
            ]);
            service.currentPlayer = mockedPlayer;
            service.currentTile = mockedGame.map.tiles[0][0];
            service.findFastestRoute(mockedGame.map.tiles[0][1]);

            expect(mockedGame.map.tiles[0][0].data).not.toContain(TileData.FastestRoute);
            expect(mockedGame.map.tiles[0][1].data).not.toContain(TileData.FastestRoute);
        });
    });
});
