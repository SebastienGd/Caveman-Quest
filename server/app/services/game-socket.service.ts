import { Game } from '@app/classes/game';
import { GameConstants } from '@app/utils/constants/game-constants';
import { GameEvent } from '@app/utils/constants/game-events';
import { GameMapEvent } from '@app/utils/constants/map-events';
import { NotificationMessage } from '@app/utils/constants/notification-messages';
import { TimerEvent } from '@app/utils/constants/timer-events';
import { isActivePlayer, isAdmin, isVirtualPlayer } from '@app/utils/game-checks';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { WebRoute } from '@common/constants/web-routes';
import { GameBase } from '@common/interfaces/game';
import { ObjectName } from '@common/interfaces/object';
import { Player } from '@common/interfaces/player';
import { Movement, Position } from '@common/interfaces/position';
import { Socket } from 'socket.io';
import { EventEmitter } from 'stream';
import { Service } from 'typedi';
import { EndGameStatsSocketService } from './end-game-stats-socket.service';
import { RouteManager } from './routes-manager';

@Service()
export class GameSocketService extends EventEmitter {
    private games: Map<string, Game>;
    constructor(
        private routeManager: RouteManager,
        private endGameStatsService: EndGameStatsSocketService,
    ) {
        super();
        this.games = new Map();
    }

    addGame(game: Game): void {
        this.games.set(game.code, game);
        this.startGame(game);
    }

    removeGame(code: string): boolean {
        return this.games.delete(code);
    }

    getGame(code: string): Game | undefined {
        return this.games.get(code);
    }

    createGame(game: GameBase): Game {
        return new Game(game.map, game.code, game.players);
    }

    getGameIfActivePlayer(socket: Socket): Game | undefined {
        const game = this.getGame(socket.data);
        const allowedToUseGame = game && !game.timer.paused && isActivePlayer(game, socket.id);
        return allowedToUseGame ? game : undefined;
    }

    setupEventHandlers(socket: Socket): void {
        this.handleSocketEndTurn(socket);
        this.handleSocketDebugMode(socket);
        this.handleSocketUpdateGame(socket);
        this.handleSocketMovePlayer(socket);
        this.handleSocketSelectObject(socket);
        this.handleSocketInteractWithDoor(socket);
        this.handleSocketFindEntitiesAtProximity(socket);
    }

    handleDisconnecting(socket: Socket) {
        const game = this.getGame(socket.data);
        if (!game) return;
        socket.emit(RoomEvent.ClearJournal);
        socket.leave(Room.Game + socket.data);
        socket.emit(RoomEvent.RedirectTo, WebRoute.Home);
        game.disconnectPlayer(socket.id);

        if (game.players.some((player) => !isVirtualPlayer(player))) return;
        else {
            game.destroy();
            this.removeGame(game.code);
        }
    }

    handlerWrapper(socket: Socket, event: string, callback: (...args: unknown[]) => void) {
        this.routeManager.onWrapper(event, socket, (...args: unknown[]) => {
            const game = this.getGameIfActivePlayer(socket);
            if (!game) return;
            callback(game, ...args);
        });
    }

    private startGame(game: Game): void {
        this.emit(GameEvent.NewGame, game);
        this.routeManager.broadcastGameWithAccessibleTiles(game);
        game.timer.on(TimerEvent.NewTime, () => {
            this.routeManager.broadcastToGameRoom(game.code, GameRoomEvent.TimerValue, game.timer.time);
        });
        game.timer.start(GameConstants.RoundDuration);
        this.setupGameEventHandlers(game);
    }

    private handleSocketUpdateGame(socket: Socket): void {
        this.handlerWrapper(socket, GameRoomEvent.UpdateGame, (game: Game) => {
            this.routeManager.broadcastGameWithAccessibleTiles(game);
        });
    }

    private handleSocketMovePlayer(socket: Socket): void {
        this.handlerWrapper(socket, GameRoomEvent.MovePlayer, (game: Game, position: Position) => {
            game.movePlayer(position);
        });
    }

    private handleSocketInteractWithDoor(socket: Socket): void {
        this.handlerWrapper(socket, GameRoomEvent.InteractWithDoor, (game: Game, position: Position) => {
            game.interactWithDoor(game.activePlayer.position, position);
        });
    }

    private handleSocketFindEntitiesAtProximity(socket: Socket): void {
        this.handlerWrapper(socket, GameRoomEvent.FindEntitiesAtProximity, (game: Game) => {
            if (!game.activePlayer.player.actionsLeft) return;
            const position = game.activePlayer.position;
            const nbrOfEntities = game.map.findPlayersAtProximity(position) + game.map.findDoorsAtProximity(position);
            if (nbrOfEntities) {
                socket.emit(GameRoomEvent.UpdateGame, game.toGameBase());
                game.map.resetTilesData();
            }
        });
    }

    private handleSocketEndTurn(socket: Socket): void {
        this.handlerWrapper(socket, GameRoomEvent.EndTurn, (game: Game) => {
            game.endTurn();
        });
    }

    private handleSocketDebugMode(socket: Socket) {
        socket.on(GameRoomEvent.ToggleDebugMode, () => {
            const game = this.getGame(socket.data);
            if (!isAdmin(game, socket.id)) return;
            game.setDebugMode(!game.data.debugging);
        });
    }

    private handleSocketSelectObject(socket: Socket) {
        this.handlerWrapper(socket, GameRoomEvent.SelectObject, (game: Game, objectName: ObjectName) => {
            game.swapPlayerObject(objectName);
        });
    }

    private setupGameEventHandlers(game: Game): void {
        this.handleUpdateAccessibleGame(game);
        this.handleGameMovePlayer(game);
        this.handleDebugModeChange(game);
        this.handleNewTurn(game);
        this.handleEndGame(game);
        this.handleEndGameCTF(game);
        this.handleManageInventory(game);
    }

    private handleGameMovePlayer(game: Game) {
        game.on(GameEvent.MovePlayer, (movement: Movement) => {
            this.routeManager.broadcastToGameRoom(game.code, GameRoomEvent.MovePlayer, movement);
        });
    }
    private handleDebugModeChange(game: Game) {
        game.on(GameEvent.DebugModeChange, () => {
            const message = game.data.debugging ? NotificationMessage.DebugIsOn : NotificationMessage.DebugIsOff;
            this.routeManager.broadcastToGameRoom(game.code, RoomEvent.Notify, message);
            this.routeManager.broadcastGameWithAccessibleTiles(game);
        });
    }

    private handleUpdateAccessibleGame(game: Game) {
        const broadcast = () => this.routeManager.broadcastGameWithAccessibleTiles(game);
        game.map.on(GameMapEvent.DoorInteraction, broadcast);
        game.on(GameEvent.UpdateAccessibleGame, broadcast);
    }

    private handleNewTurn(game: Game) {
        game.on(GameEvent.NewTurn, (newPlayer: Player) => {
            this.routeManager.broadcastToGameRoom(game.code, GameRoomEvent.UpdateGame, game.toGameBase());
            this.routeManager.broadcastToGameRoom(game.code, RoomEvent.Notify, NotificationMessage.NewTurnIs + newPlayer.name, false);
        });
    }

    private handleEndGame(game: Game) {
        game.on(GameEvent.EndGame, (winner: Player | null) => {
            game.data.gameIsOver = true;
            if (winner) {
                const isWinner = (s: Socket) => s.id === winner.id;
                this.routeManager.broadcastTo(game.code, RoomEvent.Notify, isWinner, NotificationMessage.YouWon);
                this.routeManager.broadcastTo(game.code, RoomEvent.Notify, (s) => !isWinner(s), winner.name + NotificationMessage.HasWon);
                this.routeManager.broadcastToGameRoom(game.code, GameRoomEvent.UpdateGame, game.toGameBase());
                this.endGameProcedure(game);
            } else {
                this.routeManager.broadcastToGameRoom(game.code, RoomEvent.Notify, NotificationMessage.NoWinner);
                this.routeManager.broadcastToGameRoom(game.code, GameRoomEvent.UpdateGame, game.toGameBase());
                game.destroy();
                setTimeout(() => {
                    this.routeManager.broadcastToGameRoom(game.code, RoomEvent.ClearJournal);
                    this.routeManager.broadcastToGameRoom(game.code, RoomEvent.RedirectTo, WebRoute.Home);
                    this.destroyGameRoom(game.code);
                }, GameConstants.TransitionDurationMs);
            }
        });
    }

    private handleEndGameCTF(game: Game) {
        game.on(GameEvent.EndGameCTF, (winners: Player[]) => {
            game.data.gameIsOver = true;
            const isWinner = (s: Socket) => winners.some((winner) => winner.id === s.id);
            this.routeManager.broadcastTo(game.code, RoomEvent.Notify, isWinner, NotificationMessage.YourTeamWon);
            this.routeManager.broadcastTo(game.code, RoomEvent.Notify, (s) => !isWinner(s), NotificationMessage.YourTeamLost);
            this.routeManager.broadcastToGameRoom(game.code, GameRoomEvent.UpdateGame, game.toGameBase());
            this.endGameProcedure(game);
        });
    }

    private endGameProcedure(game: Game) {
        game.destroy();
        setTimeout(() => {
            this.routeManager.broadcastToGameRoom(game.code, RoomEvent.RedirectTo, WebRoute.Stats);
            this.routeManager.io.in(Room.Game + game.code).socketsJoin(Room.Stats + game.code);
            this.endGameStatsService.addStatsRoom(game.toGameBase());

            this.destroyGameRoom(game.code);
        }, GameConstants.TransitionDurationMs);
    }

    private destroyGameRoom(accessCode: string) {
        const gameRoomSockets = this.routeManager.io.sockets.adapter.rooms.get(Room.Game + accessCode) || new Set();
        const sockets = [...gameRoomSockets].map((socketId) => this.routeManager.io.sockets.sockets.get(socketId));
        this.removeGame(accessCode);
        sockets.forEach((socket) => {
            if (socket) {
                socket.leave(Room.Game + accessCode);
            }
        });

        return sockets;
    }

    private handleManageInventory(game: Game) {
        game.on(GameRoomEvent.ManagePlayerInventory, () => {
            const activePlayer = (s: Socket) => s.id === game.activePlayer.player.id;
            this.routeManager.broadcastTo(game.code, GameRoomEvent.ManagePlayerInventory, activePlayer);
        });
    }
}
