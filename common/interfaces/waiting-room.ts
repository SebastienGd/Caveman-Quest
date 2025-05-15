import { Map } from './map';
import { Player } from './player';

export interface WaitingRoom {
    map: Map;
    code: string;
    selectedAvatars: { [id: string]: string };
    players: Player[];
    fullRoomAutoLocked: boolean;
    adminLockedRoom: boolean;
}