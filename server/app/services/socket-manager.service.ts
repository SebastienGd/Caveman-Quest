import { RoomEvent } from '@common/constants/room-events';
import { WebRoute } from '@common/constants/web-routes';
import * as http from 'http';
import * as io from 'socket.io';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { CharacterSocketService } from './character.service';
import { CombatSocketService } from './combat-socket.service';
import { GameJournalService } from './game-journal.service';
import { GameSocketService } from './game-socket.service';
import { RouteManager } from './routes-manager';
import { WaitingRoomSocketService } from './waiting-room-socket.service';
import { ChatSocketService } from './chat-socket.service';
import { EndGameStatsSocketService } from './end-game-stats-socket.service';
@Service()
export class SocketManager {
    private sio: io.Server;

    // eslint-disable-next-line max-params
    constructor(
        private socketCharacter: CharacterSocketService,
        private socketWaitingRoom: WaitingRoomSocketService,
        private socketGame: GameSocketService,
        private socketCombat: CombatSocketService,
        private socketChat: ChatSocketService,
        private routeManager: RouteManager,
        private endGameStats: EndGameStatsSocketService,
        readonly gameJournalService: GameJournalService, // this is readonly and not private because it needs to be injected in the project but isnt used explicitly
    ) {}

    setServer(server: http.Server) {
        this.sio = new io.Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
        this.routeManager.io = this.sio;
        this.handleSockets();
    }
    private handleSockets(): void {
        this.sio.on(RoomEvent.Connection, (socket: Socket) => {
            this.socketCharacter.configRoute(socket);
            this.socketWaitingRoom.configRoute(socket);
            this.socketGame.setupEventHandlers(socket);
            this.socketCombat.setupEventHandlers(socket);
            this.socketChat.setupEventHandlers(socket);

            this.routeManager.onWrapper(RoomEvent.Disconnecting, socket, () => {
                this.handleQuit(socket);
            });

            this.routeManager.onWrapper(RoomEvent.Quit, socket, () => {
                this.handleQuit(socket);
            });

            this.routeManager.onWrapper(RoomEvent.VerifyRoom, socket, (roomName: string) => {
                if (!socket.rooms.has(roomName + socket.data)) {
                    socket.emit(RoomEvent.RedirectTo, WebRoute.Home);
                }
            });
        });
    }

    private handleQuit(socket: Socket) {
        this.socketCharacter.handleDisconnecting(socket);
        this.socketWaitingRoom.handleDisconnecting(socket);
        this.socketGame.handleDisconnecting(socket);
        this.socketCombat.handleDisconnecting(socket);
        this.endGameStats.handleDisconnecting(socket);
        this.socketChat.handleDisconnecting(socket);
        socket.data = {};
        socket.rooms.forEach((room) => {
            if (room !== socket.id) {
                socket.leave(room);
            }
        });
    }
}
