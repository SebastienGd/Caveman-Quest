import { Injectable } from '@angular/core';
import { CharacterEvent } from '@common/constants/character-events';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { AttributeName, BasicPlayer, Dice, PlayerAttributes } from '@common/interfaces/player';
import characterConstants from 'src/utils/constants/character-constants';
import { SocketClientService } from './socket-client.service';
import { WaitingRoomEvent } from '@common/constants/waiting-room-events';

@Injectable({
    providedIn: 'root',
})
export class CharacterService {
    attributes: PlayerAttributes;
    name: string = '';
    selectedAvatar: string = '';
    private mapId: null | string = null;
    private draggedDice: Dice | null = null;

    constructor(private socketService: SocketClientService) {}

    selectAvatar(avatar: string) {
        this.socketService.socket.emit(CharacterEvent.SelectAvatar, avatar, () => {
            this.selectedAvatar = avatar;
        });
    }

    quit() {
        this.socketService.send(RoomEvent.Quit);
    }

    joinWaitingRoom() {
        this.attributes.currentHealth = this.attributes.health;
        const basicPlayer: BasicPlayer = {
            name: this.name,
            avatar: this.selectedAvatar,
            attributes: this.attributes,
        };
        this.socketService.socket.emit(CharacterEvent.JoinWaitingRoom, basicPlayer, this.mapId);
    }

    resetCharacterRoom(mapId: string | null) {
        this.mapId = mapId;
        if (!mapId) {
            this.socketService.send(RoomEvent.VerifyRoom, Room.Character);
        }
        this.resetCharacter();
    }

    updateAttributeBonus(name: AttributeName.Health | AttributeName.Speed, delta: number): void {
        this.attributes[name] = Math.min(Math.max(this.attributes[name] + delta, characterConstants.defaultValue), characterConstants.maxValue);
    }

    areAttributesBonusValid(): boolean {
        return this.attributes.health !== characterConstants.defaultValue || this.attributes.speed !== characterConstants.defaultValue;
    }
    areAttributesDiceValid(): boolean {
        return this.attributes.attack.dice != null;
    }

    onDragStart(diceType: Dice | null): void {
        this.draggedDice = diceType;
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
    }

    onDrop(attributeName: AttributeName.Attack | AttributeName.Defense): void {
        if (this.draggedDice) {
            this.attributes[attributeName].dice = this.draggedDice;
            const oppositeDice = this.draggedDice === Dice.Dice4 ? Dice.Dice6 : Dice.Dice4;
            const oppositeAttributeName = attributeName === AttributeName.Attack ? AttributeName.Defense : AttributeName.Attack;
            this.attributes[oppositeAttributeName].dice = oppositeDice;
        }
    }
    private resetCharacter() {
        this.name = '';
        this.draggedDice = null;
        this.attributes = {
            currentHealth: characterConstants.defaultValue,
            health: characterConstants.defaultValue,
            speed: characterConstants.defaultValue,
            attack: { value: characterConstants.defaultValue, dice: null },
            defense: { value: characterConstants.defaultValue, dice: null },
        };
        this.selectedAvatar = '';
        this.socketService.send(WaitingRoomEvent.CharacterReleased);
    }
}
