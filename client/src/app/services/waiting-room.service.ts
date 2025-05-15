import { Injectable, signal } from '@angular/core';
import { NotificationService } from '@app/services/notification.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { WaitingRoomEvent } from '@common/constants/waiting-room-events';
import { WaitingRoom } from '@common/interfaces/waiting-room';
import { MIN_AMOUNT_OF_PLAYERS } from 'src/utils/constants/waiting-room-constants';

@Injectable({
    providedIn: 'root',
})
export class WaitingRoomService {
    waitingRoom: WaitingRoom;
    playerId: string;
    roomStatus = signal<{ isLocked: boolean; message: string }>({ isLocked: false, message: '' });

    constructor(
        private socketService: SocketClientService,
        private notifyService: NotificationService,
    ) {
        this.configure();
    }

    resetRoom() {
        this.playerId = this.socketService.socket.id || '';
        this.socketService.send(RoomEvent.VerifyRoom, Room.Waiting);
    }

    resetRoomStatus() {
        this.roomStatus.set({ isLocked: false, message: '' });
    }

    toggleLock() {
        if (this.canLockGame()) {
            this.socketService.send(WaitingRoomEvent.ToggleLock);
        } else {
            this.notifyService.addNotification(
                `La salle d'attente doit avoir un minimum de ${MIN_AMOUNT_OF_PLAYERS} joueurs pour la verrouiller/déverrouiller.`,
            );
        }
    }

    kickPlayer(playerId: string) {
        this.socketService.send(WaitingRoomEvent.PlayerKickedOut, playerId);
    }

    playerQuit() {
        this.socketService.send(RoomEvent.Quit);
    }

    isGameLocked(): boolean {
        return this.waitingRoom.adminLockedRoom || this.waitingRoom.fullRoomAutoLocked;
    }

    startGame() {
        this.socketService.socket.emit(WaitingRoomEvent.StartGame, this.waitingRoom.players, this.waitingRoom.map);
    }

    addVirtualPlayer(profile: string) {
        this.socketService.send(WaitingRoomEvent.AddVirtualPlayer, profile);
    }

    private configure() {
        this.socketService.on(WaitingRoomEvent.UpdateWaitingRoom, (updatedRoom: WaitingRoom) => {
            this.waitingRoom = updatedRoom;
        });

        this.socketService.on(WaitingRoomEvent.AccessDenied, (data: { reason: string }) => {
            this.resetRoomStatus();
            if (data.reason === 'full') {
                this.roomStatus.set({ isLocked: true, message: "La salle d'attente est pleine. Veuillez réessayer plus tard." });
            } else if (data.reason === 'locked') {
                this.roomStatus.set({
                    isLocked: true,
                    message: "La salle d'attente est verrouillée. Veuillez réessayer plus tard.",
                });
            }
        });
    }

    private canLockGame(): boolean {
        return this.waitingRoom.players.length >= MIN_AMOUNT_OF_PLAYERS;
    }
}
