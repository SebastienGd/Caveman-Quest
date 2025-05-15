import { Game } from '@app/classes/game';
import { highlightAccessibleTiles } from '@app/utils/algorithms';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { WebRoute } from '@common/constants/web-routes';

import { Server, Socket } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class RouteManager {
    io: Server;

    onWrapper(event: string, socket: Socket, handler: (...args: unknown[]) => void) {
        socket.on(event, (...args: unknown[]) => {
            try {
                handler(...args);
            } catch {
                socket.emit(RoomEvent.Notify, 'problème de serveur', false);
                socket.emit(RoomEvent.RedirectTo, WebRoute.Home);
            }
        });
    }

    broadcastGameWithAccessibleTiles(game: Game): void {
        if (game.data.turnIsEnding || game.data.transitioning || game.movePath.length) {
            this.broadcastToGameRoom(game.code, GameRoomEvent.UpdateGame, game.toGameBase());
            return;
        }
        const inactivePlayers = (s: Socket) => s.id !== game.activePlayer.player.id;
        this.broadcastTo(game.code, GameRoomEvent.UpdateGame, inactivePlayers, game.toGameBase());
        highlightAccessibleTiles(game);
        this.broadcastTo(game.code, GameRoomEvent.UpdateGame, (s) => !inactivePlayers(s), game.toGameBase());
        game.map.resetTilesData();
    }

    broadcastToGameRoom(gameCode: string, event: string, ...args: unknown[]): void {
        this.io.to(Room.Game + gameCode).emit(event, ...args);
    }

    broadcastToWaitingRoom(gameCode: string, event: string, ...args: unknown[]): void {
        this.io.to(Room.Waiting + gameCode).emit(event, ...args);
    }

    broadcastToStatsRoom(gameCode: string, event: string, ...args: unknown[]): void {
        this.io.to(Room.Stats + gameCode).emit(event, ...args);
    }

    broadcastTo(gameCode: string, event: string, condition: (socket: Socket) => boolean, ...args: unknown[]): void {
        const room = this.io.sockets.adapter.rooms.get(Room.Game + gameCode);
        if (!room) return;
        room.forEach((socketId) => {
            const socket = this.io.sockets.sockets.get(socketId);
            if (condition(socket)) socket.emit(event, ...args);
        });
    }
}
