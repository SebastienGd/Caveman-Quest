import { NotificationMessage } from '@app/utils/constants/notification-messages';
import { SocketRoomsConstants } from '@app/utils/constants/socket-rooms-constants';
import { CharacterEvent } from '@common/constants/character-events';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { WebRoute } from '@common/constants/web-routes';
import { BasicPlayer, Player, PlayerData } from '@common/interfaces/player';
import { WaitingRoom } from '@common/interfaces/waiting-room';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { ChatSocketService } from './chat-socket.service';
import { MapService } from './map.service';
import { RouteManager } from './routes-manager';
import { WaitingRoomSocketService } from './waiting-room-socket.service';
import { WaitingRoomEvent } from '@common/constants/waiting-room-events';

@Service()
export class CharacterSocketService {
    constructor(
        private waitingRoomService: WaitingRoomSocketService,
        private mapService: MapService,
        private chatService: ChatSocketService,
        private routeManager: RouteManager,
    ) {}

    handleDisconnecting(socket: Socket) {
        if (this.isInCharacterSelectionRoom(socket)) {
            this.handleCharacterSelectionQuit(socket);
        }
    }

    configRoute(socket: Socket) {
        this.routeManager.onWrapper(CharacterEvent.JoinWaitingRoom, socket, (basicPlayer: BasicPlayer, mapId: string | null) => {
            if (this.waitingRoomService.waitingRooms.has(socket.data)) {
                this.joinExistingWaitingRoom(socket, basicPlayer);
            } else if (mapId) {
                this.createWaitingRoom(socket, basicPlayer, mapId);
            }
        });

        this.routeManager.onWrapper(CharacterEvent.JoinGameWithCode, socket, (code: string) => {
            const requestedRoom = Room.Character + code;
            const waitingRoom = this.waitingRoomService.waitingRooms.get(code);
            if (!waitingRoom) {
                socket.emit(RoomEvent.Notify, NotificationMessage.InvalidCode);
                return;
            }
            if (waitingRoom.fullRoomAutoLocked || waitingRoom.adminLockedRoom) {
                socket.emit(RoomEvent.Notify, NotificationMessage.InvalidLockedRoom);
                return;
            }
            socket.join(requestedRoom);
            socket.data = code;
            socket.emit(RoomEvent.RedirectTo, WebRoute.CharacterSelection);

            return;
        });

        this.routeManager.onWrapper(CharacterEvent.SelectAvatar, socket, (avatar: string, allowChange: () => void) => {
            const waitingRoom = this.waitingRoomService.waitingRooms.get(socket.data);
            if (!waitingRoom) {
                allowChange();
                return;
            }
            if (!Object.values(waitingRoom.selectedAvatars).includes(avatar)) {
                delete waitingRoom.selectedAvatars[socket.id];
                waitingRoom.selectedAvatars[socket.id] = avatar;
                allowChange();
            }
            this.waitingRoomService.broadcastWaitingRoomUpdate(socket.data);
        });
    }

    private handleCharacterSelectionQuit(socket: Socket) {
        const accessCode = socket.data;
        const waitingRoom = this.waitingRoomService.waitingRooms.get(accessCode);
        if (!waitingRoom) return;

        delete waitingRoom.selectedAvatars[socket.id];
        this.routeManager.io.sockets.sockets.get(socket.id).leave(Room.Character + accessCode);
        this.waitingRoomService.broadcastWaitingRoomUpdate(accessCode);
    }

    private ensureUniqueName(players: Player[], name: string): string {
        let uniqueName = name;
        let nameCounter = 2;
        while (players.find((player) => player.name === uniqueName)) {
            uniqueName = `${name}-${nameCounter++}`;
        }
        return uniqueName;
    }

    private async createWaitingRoom(socket: Socket, basicPlayer: BasicPlayer, mapId: string) {
        const player = this.constructPlayer(socket.id, basicPlayer, true);
        let codeDigits = '';
        const selectedMap = await this.mapService.getMapById(mapId);
        if (!selectedMap || !selectedMap.visibility) {
            socket.emit(RoomEvent.Notify, NotificationMessage.UnavailableMap);
            socket.emit(RoomEvent.RedirectTo, WebRoute.Home);
            return;
        }
        do {
            codeDigits = Array.from({ length: SocketRoomsConstants.NbrOfDigits }, () =>
                Math.floor(Math.random() * SocketRoomsConstants.MaxDigit),
            ).join('');
        } while (this.waitingRoomService.waitingRooms.has(codeDigits));
        socket.data = codeDigits;
        this.chatService.createChatRoom(codeDigits);
        const waitingRoom: WaitingRoom = {
            map: selectedMap,
            code: codeDigits,
            players: [player],
            fullRoomAutoLocked: false,
            adminLockedRoom: false,
            selectedAvatars: {},
        };
        waitingRoom.selectedAvatars[player.id] = player.avatar;
        this.waitingRoomService.waitingRooms.set(codeDigits, waitingRoom);

        socket.join(Room.Waiting + codeDigits);
        this.waitingRoomService.broadcastWaitingRoomUpdate(codeDigits);
        socket.emit(RoomEvent.RedirectTo, WebRoute.WaitingRoom);
        this.chatService.broadcastWaitingRoomChat(codeDigits);
    }

    private joinExistingWaitingRoom(socket: Socket, basicPlayer: BasicPlayer) {
        const accessCode = socket.data;
        const requestedWaitRoom = this.waitingRoomService.waitingRooms.get(accessCode);
        const player = this.constructPlayer(socket.id, basicPlayer, false);
        if (requestedWaitRoom.fullRoomAutoLocked) {
            socket.emit(WaitingRoomEvent.AccessDenied, { reason: 'full' });
            return;
        }
        if (requestedWaitRoom.adminLockedRoom) {
            socket.emit(WaitingRoomEvent.AccessDenied, { reason: 'locked' });
            return;
        }

        player.name = this.ensureUniqueName(requestedWaitRoom.players, player.name);
        socket.leave(Room.Character + accessCode);
        socket.join(Room.Waiting + accessCode);
        requestedWaitRoom.players.push(player);
        this.waitingRoomService.broadcastWaitingRoomUpdate(accessCode);
        socket.emit(RoomEvent.RedirectTo, WebRoute.WaitingRoom);
        this.chatService.broadcastWaitingRoomChat(accessCode);
    }

    private isInCharacterSelectionRoom(socket: Socket) {
        return socket.rooms.has(Room.Character + socket.data);
    }

    private constructPlayer(socketId: string, basicPlayer: BasicPlayer, isAdmin: boolean): Player {
        return {
            id: socketId,
            name: basicPlayer.name,
            avatar: basicPlayer.avatar,
            stats: {
                victories: 0,
                defeats: 0,
                evasions: 0,
                combat: 0,
                lostHP: 0,
                damageDone: 0,
                nbrOfPickedUpObjects: 0,
                tilesVisitedPercentage: 0,
            },
            diceResult: 0,
            data: isAdmin ? [PlayerData.Admin] : [],
            movesLeft: basicPlayer.attributes.speed,
            actionsLeft: 1,
            attributes: basicPlayer.attributes,
            inventory: [],
        };
    }
}
