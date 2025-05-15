import { Injectable, signal, WritableSignal } from '@angular/core';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { RoomEvent } from '@common/constants/room-events';
import { GameBase } from '@common/interfaces/game';
import { SocketClientService } from './socket-client.service';
import { Player } from '@common/interfaces/player';

@Injectable({
    providedIn: 'root',
})
export class StatsService {
    localGame: WritableSignal<GameBase> = signal({} as GameBase);
    currentPlayer: Player;

    constructor(private socketClientService: SocketClientService) {
        this.configureRoutesToServerSocket();
    }

    disconnect() {
        this.socketClientService.send(RoomEvent.Quit);
    }

    private configureRoutesToServerSocket(): void {
        this.socketClientService.on(GameRoomEvent.UpdateGame, (gameData: GameBase) => {
            this.localGame.set(gameData);
            this.updatePlayer();
        });
    }

    private updatePlayer() {
        const updatedPlayer = this.localGame().players.find((player) => player.id === this.socketClientService.socket.id);
        if (updatedPlayer) {
            this.currentPlayer = updatedPlayer;
        } else {
            this.disconnect();
        }
    }
}
