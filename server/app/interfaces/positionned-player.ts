import { Player } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';

export interface PositionedPlayer {
    player: Player;
    position: Position;
}
