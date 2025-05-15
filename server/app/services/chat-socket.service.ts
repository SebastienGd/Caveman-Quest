import { MAX_LENGTH } from '@app/utils/constants/chat-constants';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { ChatMessage, UnformatedChatMessage } from '@common/interfaces/chat-message';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { RouteManager } from './routes-manager';

@Service()
export class ChatSocketService {
    private chatMessages: Map<string, ChatMessage[]> = new Map();

    constructor(private routeManager: RouteManager) {}

    createChatRoom(code: string): void {
        if (!this.chatMessages.has(code)) {
            this.chatMessages.set(code, []);
        }
    }

    broadcastWaitingRoomChat(code: string): void {
        const messages = this.chatMessages.get(code);
        if (!messages) return;

        this.routeManager.broadcastToWaitingRoom(code, RoomEvent.ChatMessage, messages);
    }

    handleDisconnecting(socket: Socket) {
        const code = socket.data;
        if (!code) return;

        const waiting = this.routeManager.io.sockets.adapter.rooms.get(Room.Waiting + code);
        const game = this.routeManager.io.sockets.adapter.rooms.get(Room.Game + code);
        const stats = this.routeManager.io.sockets.adapter.rooms.get(Room.Stats + code);

        const totalSize = (waiting?.size || 0) + (game?.size || 0) + (stats?.size || 0);

        if (totalSize === 0) {
            this.chatMessages.set(code, []);
            this.removeChatRoom(code);
        }
    }

    setupEventHandlers(socket: Socket): void {
        this.routeManager.onWrapper(RoomEvent.ChatMessage, socket, (payload: UnformatedChatMessage) => {
            const code = socket.data;
            const roomMessages = this.chatMessages.get(code);
            if (!roomMessages) return;

            const trimmedContent = payload.content.trim();
            if (trimmedContent.length === 0 || trimmedContent.length > MAX_LENGTH) return;

            const now = new Date();
            const timestamp = now.toLocaleTimeString('en-CA', {
                timeZone: 'America/Toronto',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });

            const chatMessage: ChatMessage = {
                author: payload.author,
                timestamp,
                content: trimmedContent,
            };
            roomMessages.push(chatMessage);
            this.sendMessages(socket, code, roomMessages);
        });
    }
    private sendMessages(socket: Socket, code: string, roomMessages: ChatMessage[]) {
        const isInWaitingRoom = socket.rooms.has(Room.Waiting + code);
        const isInGameRoom = socket.rooms.has(Room.Game + code);
        const isInStatsRoom = socket.rooms.has(Room.Stats + code);

        if (isInWaitingRoom) {
            this.routeManager.broadcastToWaitingRoom(code, RoomEvent.ChatMessage, roomMessages);
        } else if (isInGameRoom) {
            this.routeManager.broadcastToGameRoom(code, RoomEvent.ChatMessage, roomMessages);
        } else if (isInStatsRoom) {
            this.routeManager.broadcastToStatsRoom(code, RoomEvent.ChatMessage, roomMessages);
        } else {
            socket.emit(RoomEvent.Notify, 'Erreur : vous n’êtes pas dans une room valide.', false);
        }
    }

    private removeChatRoom(code: string): void {
        this.chatMessages.delete(code);
    }
}
