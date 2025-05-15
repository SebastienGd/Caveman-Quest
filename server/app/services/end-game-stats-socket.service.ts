import { Service } from 'typedi';
import { GameBase } from '@common/interfaces/game';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { WebRoute } from '@common/constants/web-routes';
import { RouteManager } from './routes-manager';
import { Socket } from 'socket.io';

@Service()
export class EndGameStatsSocketService {
    private statsRooms: Map<string, GameBase>;

    constructor(private routeManager: RouteManager) {
        this.statsRooms = new Map();
    }

    addStatsRoom(game: GameBase) {
        this.statsRooms.set(game.code, game);
        this.broadcastStats(game);
    }

    handleDisconnecting(socket: Socket) {
        const accessCode = socket.data;
        const statsRoom = this.statsRooms.get(accessCode);
        if (!statsRoom) return;

        socket.emit(RoomEvent.ClearJournal);
        socket.leave(Room.Stats + accessCode);
        socket.emit(RoomEvent.RedirectTo, WebRoute.Home);
        const socketsInRoom = this.routeManager.io.sockets.adapter.rooms.get(Room.Stats + accessCode);

        if (!socketsInRoom || socketsInRoom.size === 0) {
            this.statsRooms.delete(accessCode);
        }
    }

    private broadcastStats(game: GameBase) {
        this.routeManager.broadcastToStatsRoom(game.code, GameRoomEvent.UpdateGame, game);
    }
}
