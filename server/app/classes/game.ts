import { PositionedPlayer } from '@app/interfaces/positionned-player';
import {
    dijkstra,
    filterMatrix,
    findTile,
    findTileCoordinates,
    getPlayerTeam,
    placeRandomObjects,
    playerHasObject,
    processMatrix,
    removePlayerData,
    respawnPlayer,
    scatterObjects,
    shuffleArray,
    toPositionedTiles,
} from '@app/utils/algorithms';
import { CombatEvent } from '@app/utils/constants/combat-events';
import { GameConstants } from '@app/utils/constants/game-constants';
import { GameEvent } from '@app/utils/constants/game-events';
import { INVENTORY_SIZE } from '@app/utils/constants/inventory-constants';
import { TimerEvent } from '@app/utils/constants/timer-events';
import {
    isActivePlayer,
    isAdmin,
    isEmptyTile,
    isGameOver,
    isTurnDone,
    isValidTileCost,
    isVirtualPlayer,
    isWalkableTile,
} from '@app/utils/game-checks';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { GameBase, GameData, GameStats } from '@common/interfaces/game';
import { GameMode, Map } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { Player, PlayerData } from '@common/interfaces/player';
import { Position, PositionedTile } from '@common/interfaces/position';
import { EventEmitter } from 'events';
import { Combat } from './combat';
import { GameMap } from './game-map';
import { createObject } from './game-objects';
import { GameStatistics } from './game-statistics';
import { Timer } from './timer';
import { VirtualPlayer } from './virtual-player';

export class Game extends EventEmitter implements GameBase {
    map: GameMap;
    code: string;
    players: Player[];
    data: GameData = { debugging: false, transitioning: false, turnIsEnding: false, isSelectingObject: false, gameIsOver: false };
    stats: GameStats = { duration: 0, nbTurns: 0, doorInteractedPercentage: 0, tilesVisitedPercentage: 0, nbPlayersHeldFlag: 0 };
    movePath: PositionedTile[] = [];
    activePlayer: PositionedPlayer;
    timer: Timer = new Timer();
    combat: Combat = new Combat();
    statsManager: GameStatistics;

    constructor(map: Map, code: string, players: Player[]) {
        super();
        this.map = new GameMap(map);
        this.code = code;
        this.players = players;
        this.spawnPlayers();
        placeRandomObjects(this);
        this.generateTurnOrder();
        this.setActivePlayer(this.players[0]);
        this.setupEventHandlers();
        if (map.mode === GameMode.Ctf) this.generateTeams();
        this.emit(GameEvent.StartTurn);
        this.statsManager = new GameStatistics(this);
        this.emit(GameEvent.NewGame);
    }

    destroy(): void {
        this.timer.stop();
        this.timer.removeAllListeners();
        this.combat.destroy();
        this.map.removeAllListeners();
        this.removeAllListeners();
    }

    disconnectPlayer(id: string) {
        const player = this.findPlayer(id);
        const spawnPoint = findTile(this.map.tiles, player.spawnPoint);
        scatterObjects(this, player);
        this.map.deleteSpawnPoint(spawnPoint, player);
        this.map.deletePlayer(player);
        player.data.push(PlayerData.Disconnected);
        this.emit(GameEvent.Disconnect, player);
        if (isAdmin(this, id)) this.setDebugMode(false);
        if (this.tryEndGame()) return;

        if (isActivePlayer(this, player.id)) {
            this.movePath = [];
            this.endTurn();
        } else {
            this.emit(GameEvent.UpdateAccessibleGame);
        }
    }

    endTurn(): void {
        const nextPlayer = this.getNextPlayer();
        if (nextPlayer && !this.data.turnIsEnding && !this.data.transitioning) {
            this.data.turnIsEnding = true;
            const checkMovePath = setInterval(() => {
                if (this.movePath.length === 0 && !this.data.isSelectingObject && !this.data.gameIsOver) {
                    clearInterval(checkMovePath);
                    this.resetActivePlayer();

                    this.timer.start(GameConstants.TransitionDurationSeconds);
                    this.data.transitioning = true;
                    this.data.turnIsEnding = false;
                    this.emit(GameEvent.NewTurn, nextPlayer);

                    setTimeout(() => {
                        this.setActivePlayer(nextPlayer);

                        this.data.transitioning = false;
                        this.emit(GameEvent.UpdateAccessibleGame);
                        this.timer.start(GameConstants.RoundDuration);
                        this.emit(GameEvent.StartTurn);
                    }, GameConstants.TransitionDurationMs);
                } else if (this.data.gameIsOver) {
                    clearInterval(checkMovePath);
                }
            }, GameConstants.MoveDurationMs);
        }
    }

    movePlayer(to: Position) {
        const positionedTiles = toPositionedTiles(this.map.tiles);
        const startTile = filterMatrix(positionedTiles, (tile) => tile.tile.player === this.activePlayer.player)[0];
        const endTile = findTile(positionedTiles, to);
        const movePath = dijkstra(this.map, startTile.tile, endTile.tile).filter(
            (tile) => isWalkableTile(tile, this.activePlayer.player) && isValidTileCost(tile.cost, this.activePlayer.player.movesLeft, this),
        );

        for (const obj of this.activePlayer.player.inventory) {
            const shouldContinue = obj.onMovePlayer?.(this, movePath[0], movePath[movePath.length - 1]);
            if (shouldContinue === false) return;
        }

        if (movePath.length > 1) {
            if (this.data.debugging && !isVirtualPlayer(this.activePlayer.player)) {
                this.movePath = this.movePath.filter((positionedTile) => isEmptyTile(positionedTile));
                this.movePath = [movePath[0], movePath[movePath.length - 1]];
            } else {
                this.movePath = movePath;
            }
            this.startMovement();
        }
    }

    toGameBase(): GameBase {
        return { map: this.map, players: this.players, code: this.code, data: this.data, stats: this.stats };
    }

    findPlayer(id: string) {
        return this.players.find((player) => player.id === id);
    }

    setDebugMode(state: boolean) {
        if (state === this.data.debugging) return;
        this.data.debugging = state;
        this.emit(GameEvent.DebugModeChange);
    }

    swapPlayerObject(objectToDropName: ObjectName) {
        const player = this.activePlayer.player;
        const playerTile = findTile(this.map.tiles, this.activePlayer.position);
        this.tryEndTurn();
        this.data.isSelectingObject = false;

        if (!playerHasObject(this.activePlayer.player, objectToDropName)) return;

        const filteredInventory = player.inventory.filter((obj) => obj.name !== objectToDropName);

        player.inventory.forEach((object) => {
            object.applyEffect?.(player, false);
        });

        const pickedUpObject = createObject(playerTile.object);

        player.inventory = [...filteredInventory, pickedUpObject];

        player.inventory.forEach((object) => {
            object.applyEffect?.(player, true);
        });
        playerTile.object.name = objectToDropName;
        this.emit(GameEvent.UpdateAccessibleGame);
        this.emit(GameEvent.PickUpObject, pickedUpObject);
    }

    interactWithDoor(playerPosition: Position, doorPosition: Position) {
        this.map.interactWithDoor(playerPosition, doorPosition);
        this.tryEndTurn();
    }

    startMovement() {
        this.emit(GameEvent.UpdateAccessibleGame);
        let currentTile = this.movePath.shift();
        const moveNext = () => {
            setTimeout(() => {
                if (!this.movePath.length) {
                    this.tryEndTurn();
                    return;
                }
                this.emit(GameEvent.MovePlayer, { start: currentTile, destination: this.movePath[0] });
                currentTile = this.movePath[0];
                this.map.movePlayerImage(this.activePlayer, this.movePath.shift(), !this.data.debugging);
                if (!this.pickUpNewObject(currentTile.tile?.object?.name) && !this.tryEndGame()) moveNext();
            }, GameConstants.MoveDurationMs);
        };
        moveNext();
    }

    private setupEventHandlers() {
        this.timer.on(TimerEvent.TimerExpired, () => {
            this.endTurn();
        });
        this.combat.on(CombatEvent.CombatEnd, (won: boolean) => {
            this.handleCombatEnd(won);
        });
        this.combat.on(CombatEvent.CombatStart, () => {
            this.timer.pause();
        });
    }

    private handleCombatEnd(won: boolean) {
        if (this.tryEndGame()) return;
        this.timer.start();
        const winner = this.combat.activePlayer;
        const loser = this.combat.inactivePlayer;

        if (this.activePlayer.player === winner && !won) {
            this.tryEndTurn();
        } else if (this.activePlayer.player === winner && won) {
            respawnPlayer(loser, this);
            this.tryEndTurn();
        } else if (won) {
            respawnPlayer(this.activePlayer.player, this);
            this.endTurn();
        } else {
            this.tryEndTurn();
        }
    }

    private resetActivePlayer() {
        const player = this.activePlayer.player;
        removePlayerData(player, [PlayerData.Active]);
        player.movesLeft = player.attributes.speed;
        player.actionsLeft = 1;
        player.inventory.forEach((object) => {
            object.onResetPlayer?.(player);
        });
    }

    private generateTurnOrder() {
        const DEFAULT_SPEED = 4;
        const playersWithSpeed = shuffleArray(this.players.filter((player) => player.attributes.speed > DEFAULT_SPEED));
        const playersWithoutSpeed = shuffleArray(this.players.filter((player) => player.attributes.speed === DEFAULT_SPEED));
        this.players = [...playersWithSpeed, ...playersWithoutSpeed];
    }

    private generateTeams() {
        const randomPlayerOrder = shuffleArray(this.players.slice());
        const halfOfArray = randomPlayerOrder.length / 2;
        const redTeam = randomPlayerOrder.slice(0, halfOfArray);
        const blueTeam = randomPlayerOrder.slice(halfOfArray);
        redTeam.forEach((player) => player.data.push(PlayerData.RedTeam));
        blueTeam.forEach((player) => player.data.push(PlayerData.BlueTeam));
    }

    private spawnPlayers() {
        const spawnPointTiles = filterMatrix(this.map.tiles, (tile) => tile.object?.name === ObjectName.Spawnpoint);
        const randomSpawnPoints = shuffleArray(spawnPointTiles);
        for (let i = 0; i < this.players.length; i++) {
            randomSpawnPoints[i].player = this.players[i];
            this.players[i].spawnPoint = findTileCoordinates(this.map.tiles, randomSpawnPoints[i]);
            (this.players[i] as VirtualPlayer)?.setupEventHandlers?.(this);
        }
        for (let i = randomSpawnPoints.length - 1; i >= this.players.length; i--) {
            this.map.deleteSpawnPoint(randomSpawnPoints[i]);
        }
    }

    private tryEndTurn() {
        if (isTurnDone(this)) {
            this.endTurn();
        } else {
            this.emit(GameEvent.UpdateAccessibleGame);
            this.emit(GameEvent.StartTurn);
        }
    }

    private tryEndGame() {
        const connectedPlayers = this.players.filter((p) => !p.data.includes(PlayerData.Disconnected));
        if (connectedPlayers.length <= 1) {
            this.timer.stop();
            this.data.gameIsOver = true;
            this.emit(GameEvent.EndGame, null);
        } else if (isGameOver(this)) {
            this.data.gameIsOver = true;
            this.timer.stop();
            if (this.map.mode === GameMode.Ctf) {
                const winnerTeam = getPlayerTeam(this.activePlayer.player);
                const winners = this.players.filter((player) => player.data.includes(winnerTeam));
                this.emit(GameEvent.EndGameCTF, winners);
            } else {
                this.emit(GameEvent.EndGame, this.combat.activePlayer);
            }
        } else {
            return false;
        }
        return true;
    }

    private setActivePlayer(player: Player) {
        processMatrix(this.map.tiles, (tile, i, j) => {
            if (tile.player === player) {
                this.activePlayer = { player: tile.player, position: { x: i, y: j } };
                this.activePlayer.player.data.push(PlayerData.Active);
            }
        });
    }

    private getNextPlayer(): Player | null {
        let i = this.players.indexOf(this.activePlayer.player);
        let j = 0;
        while (j++ < this.players.length) {
            i = (i + 1) % this.players.length;
            if (!this.players[i].data.includes(PlayerData.Disconnected)) return this.players[i];
        }
        return null;
    }

    private pickUpNewObject(objectName: ObjectName) {
        if (!objectName || [ObjectName.Spawnpoint, ObjectName.Random].includes(objectName)) return false;
        const player = this.activePlayer.player;
        const playerTile = findTile(this.map.tiles, this.activePlayer.position);
        const selectedObject = createObject({ name: objectName });

        if (player.inventory.length === INVENTORY_SIZE) {
            this.data.isSelectingObject = true;
            this.emit(GameRoomEvent.ManagePlayerInventory);
        } else {
            player.inventory.push(selectedObject);
            selectedObject.applyEffect?.(player, true);
            if (playerTile?.object) delete playerTile.object;
            this.emit(GameEvent.PickUpObject, selectedObject);
            this.tryEndTurn();
        }

        this.movePath = [];
        this.emit(GameEvent.UpdateAccessibleGame);
        return true;
    }
}
