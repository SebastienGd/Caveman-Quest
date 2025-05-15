import { dijkstra, filterMatrix, findTile, playerHasObject } from '@app/utils/algorithms';
import { CombatEvent } from '@app/utils/constants/combat-events';
import { DEFENSIVE_ITEM_PRIORITY } from '@app/utils/constants/defensive-player-constants';
import { GameEvent } from '@app/utils/constants/game-events';
import { INVENTORY_SIZE } from '@app/utils/constants/inventory-constants';
import { OFFENSIVE_ITEM_PRIORITY } from '@app/utils/constants/offensive-player-constants';
import { COEFF_FOR_RANDOM_TIME, DENOM_FOR_RANDOM_TIME, MAX_WAIT_TIME } from '@app/utils/constants/timer-events';
import { isValidTileCost, isWalkableTile } from '@app/utils/game-checks';
import { TILE_TYPE_TO_COST } from '@common/constants/game-constants';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { TileBase, TileType } from '@common/interfaces/map';
import { GameObject, ObjectName } from '@common/interfaces/object';
import { Player, PlayerAttributes, PlayerData, PlayerStats } from '@common/interfaces/player';
import { Position, PositionedTile } from '@common/interfaces/position';
import { Combat } from './combat';
import { Game } from './game';

export abstract class VirtualPlayer implements Player {
    id: string;
    name: string;
    avatar: string;
    data: PlayerData[];
    movesLeft: number;
    diceResult: number = 0;
    actionsLeft: number;
    attributes: PlayerAttributes;
    stats: PlayerStats = {
        victories: 0,
        defeats: 0,
        evasions: 0,
        combat: 0,
        lostHP: 0,
        damageDone: 0,
        nbrOfPickedUpObjects: 0,
        tilesVisitedPercentage: 0,
    };
    inventory: GameObject[] = [];
    spawnPoint?: Position;
    evasionAttempts?: number = 0;

    constructor(id: string, name: string, avatar: string, data: PlayerData[], attributes: PlayerAttributes) {
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.data = data;
        this.attributes = attributes;
        this.movesLeft = attributes.speed;
        this.actionsLeft = 1;
    }
    setupEventHandlers(game: Game) {
        this.handlerWrapper(game, GameEvent.StartTurn, () => {
            this.handlePlayerTurn(game);
        });
        this.handlerWrapper(game, GameRoomEvent.ManagePlayerInventory, () => {
            this.handleInventoryChoice(game);
        });
        this.handlerWrapper(game.combat, CombatEvent.ChangeTurn, () => {
            this.handleCombatTurn(game.combat);
        });
    }

    tryToMoveTowards(game: Game, path: PositionedTile[] | undefined): boolean {
        if (!path?.length) return false;
        if (!this.interactIfBlockedByDoor(game, path)) return false;
        game.movePlayer(path[path.length - 1]);
        return Boolean(game.movePath.length);
    }

    canTraverseDuringRound(path: PositionedTile[]): boolean {
        const cost = path[path.length - 1].cost;
        const nbrOfClosedDoors = path.filter((tile) => tile.tile.type === TileType.ClosedDoor).length;
        let costOfOpeningDoors = 0;
        if (nbrOfClosedDoors && nbrOfClosedDoors <= this.actionsLeft) {
            costOfOpeningDoors += nbrOfClosedDoors * (TILE_TYPE_TO_COST[TileType.ClosedDoor] - TILE_TYPE_TO_COST[TileType.OpenedDoor]);
        }
        return isValidTileCost(cost - costOfOpeningDoors, this.movesLeft);
    }

    getAllPathsTo(game: Game, isTileToVisit: (tile: TileBase) => boolean): PositionedTile[][] {
        const currentTile = filterMatrix(game.map.tiles, (tile: TileBase) => tile.player === this)[0];
        const path: PositionedTile[][] = [];
        game.map.tiles.flat().forEach((tile: TileBase) => {
            if (!isTileToVisit(tile)) return;
            const newPath = dijkstra(game.map, currentTile, tile);
            if (newPath.length) {
                if (playerHasObject(this, ObjectName.Bird)) {
                    newPath.forEach((t) => (t.cost = 0));
                }
                path.push(newPath);
            }
        });
        return path.sort((pathA, pathB) => pathA[pathA.length - 1].cost - pathB[pathB.length - 1].cost);
    }

    tryToReturnToFlagHolderSpawn(game: Game): boolean {
        const flagHolder = this.findFlagHolder(game);
        if (!flagHolder) return false;
        const spawnTile = findTile(game.map.tiles, flagHolder.spawnPoint);
        this.tryToMoveTowards(game, this.getAllPathsTo(game, (tile) => tile === spawnTile)[0]);
        game.endTurn();
        return true;
    }

    tryCaptureFlag(game: Game): boolean {
        const pathsToFlag = this.getAllPathsTo(game, (tile) => tile.object && tile.object.name === ObjectName.Flag);
        if (!pathsToFlag.length) return false;
        this.tryToMoveTowards(game, pathsToFlag[0]);
        if (!game.movePath.length) game.endTurn();
        return true;
    }

    protected tryMoveTowardsItems(game: Game, objectToPriority: { [objectType: string]: number }): boolean {
        const pathsToObjects = this.getAllPathsTo(game, (tile) => this.isTileWithObjectToPickUp(tile, objectToPriority));
        const reachableObjectPaths = pathsToObjects.filter((path) => this.canTraverseDuringRound(path));
        const pathsToConsider = reachableObjectPaths.length ? reachableObjectPaths : pathsToObjects;

        const pathToPriority = (path: PositionedTile[]) => objectToPriority[path[path.length - 1].tile.object.name];
        pathsToConsider.sort((pathA, pathB) => pathToPriority(pathB) - pathToPriority(pathA));
        return this.tryToMoveTowards(game, pathsToConsider[0]);
    }

    protected isTileWithObjectToPickUp(tile: TileBase, objectToPriority: { [objectType: string]: number }): boolean {
        const hasReplaceableObject = this.inventory.some((obj) => objectToPriority[obj.name] < objectToPriority[tile?.object?.name]);
        const objectIsWorthPicking = this.inventory.length < INVENTORY_SIZE || hasReplaceableObject;
        return tile.object && ![ObjectName.Spawnpoint, ObjectName.Flag].includes(tile.object.name) && !tile.player && objectIsWorthPicking;
    }

    protected findFlagHolder(game: Game): Player {
        const playerHasFlag = (player: Player) => player.inventory.find((obj) => obj.name === ObjectName.Flag);
        return game.players.find((player) => playerHasFlag(player));
    }

    protected handleInventoryChoice(game: Game): void {
        const playerProfile = this.data.includes(PlayerData.DefensiveVP) ? 'defensive' : 'offensive';
        const currentTile = findTile(game.map.tiles, game.activePlayer.position);
        const item = currentTile?.object;
        if (!item) return;
        if (this.shouldPickUpObject(item.name, playerProfile)) {
            this.switchObject(game);
        } else {
            game.swapPlayerObject(item.name);
        }
    }

    private findLowestPriorityObject(itemPriority: { [key: string]: number }): GameObject | null {
        if (!this.inventory.length) return null;

        return this.inventory.reduce((lowest, current) => {
            return itemPriority[current.name] < itemPriority[lowest.name] ? current : lowest;
        }, this.inventory[0]);
    }

    private shouldPickUpObject(objectName: ObjectName, profile: string): boolean {
        const itemPriority = profile === 'defensive' ? DEFENSIVE_ITEM_PRIORITY : OFFENSIVE_ITEM_PRIORITY;
        const tileObjectPriority = itemPriority[objectName];

        const lowestPriorityObj = this.findLowestPriorityObject(itemPriority);
        if (!lowestPriorityObj) return true;

        return tileObjectPriority > itemPriority[lowestPriorityObj.name];
    }

    private switchObject(game: Game): void {
        const playerProfile = this.data.includes(PlayerData.DefensiveVP) ? 'defensive' : 'offensive';
        const itemPriority = playerProfile === 'defensive' ? DEFENSIVE_ITEM_PRIORITY : OFFENSIVE_ITEM_PRIORITY;

        const lowestPriorityObj = this.findLowestPriorityObject(itemPriority);

        if (lowestPriorityObj) {
            game.swapPlayerObject(lowestPriorityObj.name);
        }
    }

    private interactIfBlockedByDoor(game: Game, path: PositionedTile[]): boolean {
        let possibleDoorIndex = 1;
        if (playerHasObject(this, ObjectName.Bird)) {
            const isWalkable = (tile: PositionedTile) => isWalkableTile(tile, this);
            possibleDoorIndex = path.length - path.slice().reverse().findIndex(isWalkable);
        }

        const nextPosition = path[possibleDoorIndex];
        const playerPosition = path[0];

        if (nextPosition?.tile.type === TileType.ClosedDoor) {
            if (!this.actionsLeft) {
                return false;
            }
            game.map.interactWithDoor(playerPosition, nextPosition);
            const temp = path.slice(1);
            temp.forEach((tile) => {
                tile.cost -= TILE_TYPE_TO_COST[TileType.ClosedDoor] - TILE_TYPE_TO_COST[TileType.OpenedDoor];
            });
        }
        return true;
    }

    private handlerWrapper(emitter: Game | Combat, event: string, callback: () => void) {
        const dataToHave = emitter instanceof Game ? PlayerData.Active : PlayerData.ActiveInCombat;
        emitter.on(event, () => {
            try {
                if (!this.data.includes(dataToHave)) return;
                const thinkTime = Math.max(MAX_WAIT_TIME, ((COEFF_FOR_RANDOM_TIME * emitter.timer.time) / DENOM_FOR_RANDOM_TIME) * Math.random());
                setTimeout(() => {
                    if (!this.data.includes(dataToHave)) return;
                    callback();
                }, thinkTime);
            } catch {
                return;
            }
        });
    }

    abstract handlePlayerTurn(game: Game): void;
    abstract handleCombatTurn(combat: Combat): void;
}
