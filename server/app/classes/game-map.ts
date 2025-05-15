import { PositionedPlayer } from '@app/interfaces/positionned-player';
import { filterMatrix, findTile, getNeighbors, getPlayerTeam, processMatrix } from '@app/utils/algorithms';
import { GameMapEvent } from '@app/utils/constants/map-events';
import { isDoorTile } from '@app/utils/game-checks';
import { TILE_TYPE_TO_COST } from '@common/constants/game-constants';
import { GameMode, Map, TileBase, TileData, TileType } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';
import { EventEmitter } from 'events';

export class GameMap extends EventEmitter implements Map {
    _id: string;
    name: string;
    description: string;
    mode: GameMode;
    size: number;
    tiles: TileBase[][];
    createdAt: string;
    updatedAt: string;
    visibility: boolean;
    constructor(map: Map) {
        super();
        this._id = map._id;
        this.name = map.name;
        this.description = map.description;
        this.mode = map.mode;
        this.size = map.size;
        this.tiles = map.tiles;
        this.createdAt = map.createdAt;
        this.updatedAt = map.updatedAt;
        this.visibility = map.visibility;
    }

    deleteSpawnPoint(tile: TileBase, player?: Player) {
        delete tile.object;
        if (player) delete player.spawnPoint;
    }

    deletePlayer(player: Player) {
        processMatrix(this.tiles, (tile) => {
            if (tile.player === player) delete tile.player;
        });
    }

    movePlayerImage(activePlayer: PositionedPlayer, to: Position, decrementMovesLeft: boolean) {
        const startTile = filterMatrix(this.tiles, (tile) => tile.player === activePlayer.player)[0];
        const endTile = findTile(this.tiles, to);
        if (!startTile || !endTile) return;
        activePlayer.position = to;
        endTile.player = startTile.player;
        if (decrementMovesLeft) activePlayer.player.movesLeft -= TILE_TYPE_TO_COST[endTile.type];

        delete startTile.player;
    }

    findDoorsAtProximity(position: Position): number {
        const condition = (tile: TileBase) => tile.type === TileType.ClosedDoor || (tile.type === TileType.OpenedDoor && !tile.player);
        return this.findEntitiesAtProximity(position, condition, TileData.DoorInProximity);
    }

    findPlayersAtProximity(position: Position): number {
        const startTile = findTile(this.tiles, position);
        const team = getPlayerTeam(startTile.player);
        const condition = (tile: TileBase) => !tile.player?.data.includes(team) && Boolean(tile.player);
        return this.findEntitiesAtProximity(position, condition, TileData.PlayerInProximity);
    }

    interactWithDoor(playerPosition: Position, doorPosition: Position): void {
        const tile = findTile(this.tiles, playerPosition);
        const door = findTile(this.tiles, doorPosition);
        if (door.player || !isDoorTile(door) || !tile.player.actionsLeft) return;
        door.type = door.type === TileType.OpenedDoor ? TileType.ClosedDoor : TileType.OpenedDoor;
        --tile.player.actionsLeft;
        this.emit(GameMapEvent.DoorInteraction, door);
    }

    resetTilesData(): void {
        processMatrix(this.tiles, (tile) => {
            delete tile.data;
        });
    }

    private findEntitiesAtProximity(position: Position, condition: (tile: TileBase) => boolean, dataType: TileData): number {
        let entitiesAtProximity = 0;
        const tiles = getNeighbors(position, this.tiles);
        tiles.forEach((tile) => {
            if (condition(tile)) {
                if (!tile.data) tile.data = [];
                tile.data.push(dataType);
                ++entitiesAtProximity;
            }
        });
        return entitiesAtProximity;
    }
}
