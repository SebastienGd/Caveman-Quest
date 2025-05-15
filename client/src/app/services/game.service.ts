import { Injectable, signal, WritableSignal } from '@angular/core';
import { CostConstants, TILE_TYPE_TO_COST } from '@common/constants/game-constants';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { GameBase } from '@common/interfaces/game';
import { TileBase, TileData } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { Player, PlayerData } from '@common/interfaces/player';
import { Movement, Position } from '@common/interfaces/position';
import { GameAlgorithmsService } from './game-algorithms.service';
import { SocketClientService } from './socket-client.service';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    localGame: WritableSignal<GameBase> = signal({} as GameBase);
    currentTime: number = 0;

    currentPlayer: Player;
    opponentPlayer: Player;
    currentTile: TileBase;

    isInventoryPopupVisible: boolean = false;

    constructor(
        private socketClientService: SocketClientService,
        private algorithms: GameAlgorithmsService,
    ) {
        this.configureRoutesToServerSocket();
    }

    toggleDebugMode() {
        if (this.currentPlayer.data.includes(PlayerData.Admin)) {
            this.socketClientService.send(GameRoomEvent.ToggleDebugMode);
        }
    }

    refreshGame() {
        this.socketClientService.send(RoomEvent.VerifyRoom, Room.Game);
        this.socketClientService.send(GameRoomEvent.UpdateGame);
    }

    disconnect() {
        this.socketClientService.send(RoomEvent.Quit);
    }

    handleTurnEnd() {
        this.socketClientService.send(GameRoomEvent.EndTurn);
    }

    initiateCombat(opponentTile: TileBase) {
        if (opponentTile.player) {
            this.opponentPlayer = opponentTile.player;
            this.socketClientService.send(GameRoomEvent.InitiateCombat, this.opponentPlayer.id);
        }
    }

    interactDoor(doorTile: TileBase) {
        const doorPosition = this.algorithms.findTilePosition(this.localGame().map, doorTile);
        this.socketClientService.send(GameRoomEvent.InteractWithDoor, doorPosition);
    }

    movePlayer(destinationTile: TileBase) {
        const destinationPosition = this.algorithms.findTilePosition(this.localGame().map, destinationTile);
        this.socketClientService.send(GameRoomEvent.MovePlayer, destinationPosition);
    }

    findEntitiesAtProximity() {
        const isEntityAtProximity = (data: TileData) => [TileData.DoorInProximity, TileData.PlayerInProximity].includes(data);
        const isTileShowingEntity = (tile: TileBase) => tile.data?.find(isEntityAtProximity);
        if (!this.localGame().map.tiles.flat().find(isTileShowingEntity)) {
            this.socketClientService.send(GameRoomEvent.FindEntitiesAtProximity);
        } else {
            this.refreshGame();
        }
    }

    evadeAction() {
        this.socketClientService.send(GameRoomEvent.EvadeAction);
    }

    attackAction() {
        this.socketClientService.send(GameRoomEvent.AttackAction);
    }

    selectObject(objectName: ObjectName) {
        this.socketClientService.send(GameRoomEvent.SelectObject, objectName);
    }

    findPlayer(data: PlayerData[]) {
        return this.localGame().players.find((player) => this.isPlayer(player, data));
    }

    findFastestRoute(destinationTile: TileBase) {
        if (!destinationTile?.data?.includes(TileData.Accessible)) return;
        const isFastestTile = (tile: TileBase) => (tile.data = tile.data?.filter((data) => data !== TileData.FastestRoute));
        this.localGame().map.tiles.flat().forEach(isFastestTile);

        const fastestRoute = this.algorithms.dijkstra(this.localGame().map, this.currentTile, destinationTile);
        if (fastestRoute.length && this.currentPlayer.movesLeft >= fastestRoute[fastestRoute.length - 1].cost - CostConstants.TileCostAcceptance) {
            fastestRoute.forEach((positionnedTile) => {
                positionnedTile.tile.data = [...(positionnedTile.tile.data ?? []), TileData.FastestRoute];
            });
        }
    }

    private configureRoutesToServerSocket() {
        this.socketClientService.on(GameRoomEvent.UpdateGame, (gameData: GameBase) => {
            this.localGame.set(gameData);
            this.updatePlayer();
            this.findCurrentTile();
            this.updateOpponentPlayer();
        });

        this.socketClientService.on(GameRoomEvent.MovePlayer, (data: Movement) => {
            this.singleTileMove(data.start, data.destination);
        });

        this.socketClientService.on(GameRoomEvent.TimerValue, (value: number) => {
            this.currentTime = value;
        });

        this.socketClientService.on(GameRoomEvent.ManagePlayerInventory, () => {
            this.isInventoryPopupVisible = true;
        });
    }

    private updatePlayer() {
        const updatedPlayer = this.localGame().players.find((player) => player.id === this.socketClientService.socket.id);
        if (updatedPlayer) {
            this.currentPlayer = updatedPlayer;
            const spawn = this.currentPlayer.spawnPoint;
            if (spawn) {
                const spawnTile = this.localGame().map.tiles[spawn.y][spawn.x];
                spawnTile.data = [...(spawnTile.data || []), TileData.SpawnPointIndicator];
            }
        } else {
            this.disconnect();
        }
    }

    private updateOpponentPlayer() {
        if (this.currentPlayer.data.includes(PlayerData.Combat)) {
            const foundOpponent = this.localGame().players.find(
                (player) => player.data.includes(PlayerData.Combat) && player.id !== this.socketClientService.socket.id,
            );
            if (foundOpponent) {
                this.opponentPlayer = foundOpponent;
            }
        }
    }

    private isPlayer(player: Player, data: PlayerData[]) {
        return data.every((info) => player.data.includes(info));
    }

    private findCurrentTile() {
        if (this.currentPlayer.data.includes(PlayerData.Active)) {
            const playerTile = this.localGame()
                .map.tiles.flat()
                .find((tile) => tile.player?.id === this.socketClientService.socket.id);
            if (playerTile) {
                this.currentTile = playerTile;
            }
        }
    }

    private singleTileMove(startPos: Position, pos: Position) {
        const startTile = this.algorithms.findTileFromPosition(this.localGame().map, startPos);
        const destinationTile = this.algorithms.findTileFromPosition(this.localGame().map, pos);
        const movedPlayer = this.localGame().players.find((p) => p.id === startTile?.player?.id);
        if (!this.localGame().data.debugging && movedPlayer) movedPlayer.movesLeft -= TILE_TYPE_TO_COST[destinationTile.type];
        destinationTile.player = startTile.player;
        delete startTile.player;
    }
}
