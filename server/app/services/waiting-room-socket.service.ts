import { DefensiveVirtualPlayer } from '@app/classes/defensive-virtual-player';
import { OffensiveVirtualPlayer } from '@app/classes/offensive-virtual-player';
import { NotificationMessage } from '@app/utils/constants/notification-messages';
import { VIRTUAL_PLAYER_NAMES } from '@app/utils/constants/virtual-player-names';
import { AVATARS } from '@common/constants/avatars';
import { SIZE_TO_PLAYER_COUNT } from '@common/constants/map-constants';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { WaitingRoomEvent } from '@common/constants/waiting-room-events';
import { WebRoute } from '@common/constants/web-routes';
import { GameBase } from '@common/interfaces/game';
import { GameMode } from '@common/interfaces/map';
import { Dice, Player, PlayerAttributes, PlayerData } from '@common/interfaces/player';
import { WaitingRoom } from '@common/interfaces/waiting-room';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { GameSocketService } from './game-socket.service';
import { RouteManager } from './routes-manager';

@Service()
export class WaitingRoomSocketService {
    waitingRooms = new Map<string, WaitingRoom>();
    constructor(
        private gameService: GameSocketService,
        private routeManager: RouteManager,
    ) {}

    handleDisconnecting(socket: Socket) {
        if (this.isInWaitingRoom(socket)) {
            const waitingRoom = this.waitingRooms.get(socket.data);
            const player = waitingRoom.players.find((p) => p.id === socket.id);
            if (player.data.includes(PlayerData.Admin)) {
                this.handleAdminQuit(socket);
            } else {
                this.handlePlayerQuit(socket);
            }
        }
    }

    configRoute(socket: Socket) {
        this.routeManager.onWrapper(WaitingRoomEvent.ToggleLock, socket, () => {
            const accessCode = socket.data;
            const requestedWaitRoom = this.waitingRooms.get(accessCode);
            if (!requestedWaitRoom || requestedWaitRoom.fullRoomAutoLocked) return;

            requestedWaitRoom.adminLockedRoom = !requestedWaitRoom.adminLockedRoom;
            this.broadcastWaitingRoomUpdate(accessCode);
        });

        this.routeManager.onWrapper(WaitingRoomEvent.AddVirtualPlayer, socket, (profile: string) => {
            const accessCode = socket.data;
            const waitingRoom = this.waitingRooms.get(accessCode);

            const avatar = this.getVirtualAvatar(accessCode);
            const name = this.getVirtualName(accessCode, avatar);

            const virtualPlayer = this.createVirtualPlayer(profile, accessCode, name, avatar);
            waitingRoom.players.push(virtualPlayer);
            waitingRoom.selectedAvatars[virtualPlayer.id] = virtualPlayer.avatar;
            this.broadcastWaitingRoomUpdate(accessCode);
        });

        this.routeManager.onWrapper(WaitingRoomEvent.PlayerKickedOut, socket, (id: string) => {
            if (id.includes('virtual')) {
                this.deleteVirtualPlayer(id, socket.data);
            } else {
                this.handlePlayerKick(id);
            }
        });

        this.routeManager.onWrapper(WaitingRoomEvent.CharacterReleased, socket, () => {
            const waitingRoom = this.waitingRooms.get(socket.data);
            socket.emit(WaitingRoomEvent.UpdateWaitingRoom, waitingRoom);
        });

        this.routeManager.onWrapper(WaitingRoomEvent.StartGame, socket, () => {
            const accessCode = socket.data;
            const waitingRoom = this.waitingRooms.get(accessCode);
            if (waitingRoom.map.mode === GameMode.Ctf && waitingRoom.players.length % 2 !== 0) {
                socket.emit(RoomEvent.Notify, NotificationMessage.PlayerNumberUneven);
                return;
            }
            const game: GameBase = {
                code: accessCode,
                map: waitingRoom.map,
                players: waitingRoom.players,
                data: { debugging: false, turnIsEnding: false, transitioning: false, isSelectingObject: false, gameIsOver: false },
                stats: { duration: 0, nbTurns: 0, doorInteractedPercentage: 0, tilesVisitedPercentage: 0, nbPlayersHeldFlag: 0 },
            };
            this.routeManager.io.to(Room.Character + accessCode).emit(RoomEvent.RedirectTo, WebRoute.Home);
            this.routeManager.io.to(Room.Character + accessCode).emit(RoomEvent.Notify, NotificationMessage.StartGame);
            this.routeManager.io.to(Room.Waiting + accessCode).emit(RoomEvent.RedirectTo, WebRoute.GamePage);
            this.routeManager.io.in(Room.Waiting + accessCode).socketsJoin(Room.Game + accessCode);
            this.gameService.addGame(this.gameService.createGame(game));
            this.destroyWaitingRoom(accessCode);
        });
    }

    broadcastWaitingRoomUpdate(accessCode: string) {
        const requestedWaitRoom = this.waitingRooms.get(accessCode);
        this.checkToAutoLock(requestedWaitRoom);
        this.routeManager.io.to(Room.Waiting + accessCode).emit(WaitingRoomEvent.UpdateWaitingRoom, requestedWaitRoom);
        this.routeManager.io.to(Room.Character + accessCode).emit(WaitingRoomEvent.UpdateWaitingRoom, requestedWaitRoom);
    }

    private handleAdminQuit(socket: Socket) {
        const rooms = [Room.Waiting + socket.data, Room.Character + socket.data];
        rooms.forEach((room) => {
            this.routeManager.io.to(room).emit(RoomEvent.RedirectTo, WebRoute.Home);
            socket.to(room).emit(RoomEvent.Notify, NotificationMessage.OrganizerQuitWaitingRoom);
        });
        this.destroyWaitingRoom(socket.data).forEach((roomSocket) => (roomSocket.data = {}));
    }

    private handlePlayerQuit(socket: Socket) {
        const accessCode = socket.data;
        this.removeWaitingRoomPlayer(socket, false);
        this.broadcastWaitingRoomUpdate(accessCode);
    }

    private handlePlayerKick(id: string) {
        const accessCode = this.routeManager.io.sockets.sockets.get(id).data;
        const socket = this.routeManager.io.sockets.sockets.get(id);
        this.removeWaitingRoomPlayer(socket, true);
        this.broadcastWaitingRoomUpdate(accessCode);
    }

    private emitPlayerExitMessage(socket: Socket, player: Player, wasKicked: boolean) {
        if (wasKicked) {
            socket.emit(RoomEvent.Notify, 'Vous avez' + NotificationMessage.KickedFromWaitingRoom);
            socket.to(Room.Waiting + socket.data).emit(RoomEvent.Notify, `Le joueur ${player.name}` + NotificationMessage.KickedFromWaitingRoom);
        } else {
            socket.emit(RoomEvent.Notify, 'Vous avez' + NotificationMessage.QuitWaitingRoom);
            socket.to(Room.Waiting + socket.data).emit(RoomEvent.Notify, `Le joueur ${player.name}` + NotificationMessage.QuitWaitingRoom);
        }
    }

    private destroyWaitingRoom(accessCode: string) {
        const waitingRoomSockets = this.routeManager.io.sockets.adapter.rooms.get(Room.Waiting + accessCode);
        const characterRoomSockets = this.routeManager.io.sockets.adapter.rooms.get(Room.Waiting + accessCode);
        const sockets = [...waitingRoomSockets, ...characterRoomSockets].map((socketId) => this.routeManager.io.sockets.sockets.get(socketId));

        this.waitingRooms.delete(accessCode);
        sockets.forEach((socket) => {
            if (socket) {
                socket.leave(Room.Waiting + accessCode);
                socket.leave(Room.Character + accessCode);
            }
        });

        return sockets;
    }

    private removeWaitingRoomPlayer(socket: Socket, wasKicked: boolean) {
        const accessCode = socket.data;
        const waitingRoom = this.waitingRooms.get(accessCode);

        const player = waitingRoom.players.find((p) => p.id === socket.id);

        delete waitingRoom.selectedAvatars[socket.id];
        waitingRoom.players = waitingRoom.players.filter((p) => p !== player);
        socket.emit(RoomEvent.RedirectTo, WebRoute.Home);
        this.emitPlayerExitMessage(socket, player, wasKicked);
        socket.leave(Room.Waiting + accessCode);
        this.broadcastWaitingRoomUpdate(accessCode);
    }

    private isInWaitingRoom(socket: Socket) {
        return socket.rooms.has(Room.Waiting + socket.data);
    }

    private checkToAutoLock(requestedWaitRoom: WaitingRoom) {
        const amountOfPlayers = requestedWaitRoom.players.length;
        const maxAmountOfPlayers = SIZE_TO_PLAYER_COUNT[requestedWaitRoom.map.size].max;
        const minAmountOfPlayers = SIZE_TO_PLAYER_COUNT[requestedWaitRoom.map.size].min;

        requestedWaitRoom.fullRoomAutoLocked = amountOfPlayers >= maxAmountOfPlayers;
        requestedWaitRoom.adminLockedRoom = requestedWaitRoom.adminLockedRoom && amountOfPlayers >= minAmountOfPlayers;
    }

    private getVirtualName(accessCode: string, avatar: string): string {
        const waitingRoom = this.waitingRooms.get(accessCode);
        const takenNames = new Set(waitingRoom.players.map((p) => p.name));
        let availableNames;
        if (avatar.includes('homme')) availableNames = VIRTUAL_PLAYER_NAMES.male.filter((name: string) => !takenNames.has(name));
        else availableNames = VIRTUAL_PLAYER_NAMES.female.filter((name: string) => !takenNames.has(name));

        return availableNames[Math.floor(Math.random() * availableNames.length)];
    }

    private getVirtualAvatar(accessCode: string): string {
        const waitingRoom = this.waitingRooms.get(accessCode);
        const takenAvatars = new Set(Object.values(waitingRoom.selectedAvatars));
        const availableAvatars = AVATARS.filter((avatar) => !takenAvatars.has(avatar));

        const virtualPlayerAvatar = availableAvatars[Math.floor(Math.random() * availableAvatars.length)];
        return virtualPlayerAvatar;
    }

    private generateVirtualPlayerAttributes(): PlayerAttributes {
        const BASE_VALUE = 4;
        const HALF_PROBABILITY = 0.5;

        const applyToHealth = Math.random() < HALF_PROBABILITY;
        const health = applyToHealth ? BASE_VALUE + 2 : BASE_VALUE;
        const speed = applyToHealth ? BASE_VALUE : BASE_VALUE + 2;

        const attackGetsD6 = Math.random() < HALF_PROBABILITY;
        const attackDice = attackGetsD6 ? Dice.Dice6 : Dice.Dice4;
        const defenseDice = attackGetsD6 ? Dice.Dice4 : Dice.Dice6;

        return {
            currentHealth: health,
            health,
            speed,
            attack: {
                value: BASE_VALUE,
                dice: attackDice,
            },
            defense: {
                value: BASE_VALUE,
                dice: defenseDice,
            },
        };
    }

    private createVirtualPlayer(profile: string, accessCode: string, name: string, avatar: string): Player {
        const virtualPlayerId = name + 'virtual';
        const attributes = this.generateVirtualPlayerAttributes();
        const virtualPlayer =
            profile === 'defensive'
                ? new DefensiveVirtualPlayer(virtualPlayerId, name, avatar, [PlayerData.DefensiveVP], attributes)
                : new OffensiveVirtualPlayer(virtualPlayerId, name, avatar, [PlayerData.OffensiveVP], attributes);
        return virtualPlayer;
    }

    private deleteVirtualPlayer(id: string, accessCode: string) {
        const waitingRoom = this.waitingRooms.get(accessCode);
        const virtualPlayer = waitingRoom.players.find((player) => player.id === id);

        waitingRoom.players = waitingRoom.players.filter((p) => p !== virtualPlayer);
        delete waitingRoom.selectedAvatars[id];
        this.broadcastWaitingRoomUpdate(accessCode);
    }
}
