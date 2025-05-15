import { Player } from './player';
import { PositionedTile } from './position';

export enum ObjectName {
    Steak = 'steak', // Increases health by 1 point and defense by 1 point
    ClubWeapon = 'clubWeapon', // Increases attack by 2 points, decreases defense by 1 point
    Torch = 'torch', // Both dice have a value of 6 when the player is on water tiles
    Bone = 'bone', // In battle, if I have 1 health point left, my attack "one-shots" my opponent (they die instantly)
    Trex = 't-rex', // If I lose a fight, my opponent's amount of victories does not increase
    Bird = 'bird', // Allows movement anywhere on the map (but its effect is disabled when the player is holding the flag)
    Random = 'random',
    Flag = 'flag',
    Spawnpoint = 'spawnpoint',
}

export interface GameObject {
    name: ObjectName;

    applyEffect?: (player: Player, pickUp: boolean) => void;

    onBeforeAttack?: (combat: unknown, player: Player) => boolean;
    onCombatEnd?: (combat: unknown, won: boolean) => void;

    onMovePlayer?: (game: unknown, startTile: PositionedTile, endTile: PositionedTile) => boolean;
    onResetPlayer?: (player: Player) => void;
}
