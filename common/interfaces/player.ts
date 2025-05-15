import { GameObject } from './object';
import { Position } from './position';

export enum AttributeName {
    Health = 'health',
    Speed = 'speed',
    Defense = 'defense',
    Attack = 'attack',
}

export enum PlayerData {
    Admin,
    Regular,
    Disconnected,
    DefensiveVP,
    OffensiveVP,
    BlueTeam,
    RedTeam,
    Active,
    Transition,
    Combat,
    ActiveInCombat,
    IsOnIce,
    EvadeSuccessful,
    DeadInCombat,
}

export interface PlayerStats {
    victories: number;
    defeats: number;
    evasions: number;
    combat: number;
    lostHP: number;
    damageDone: number;
    nbrOfPickedUpObjects: number;
    tilesVisitedPercentage: number;
}

export enum Dice {
    Dice6 = 'dice6',
    Dice4 = 'dice4',
}

export interface DetailedAttribute {
    value: number;
    dice: Dice | null;
}
export interface PlayerAttributes {
    currentHealth: number;
    health: number;
    speed: number;
    attack: DetailedAttribute;
    defense: DetailedAttribute;
}

export interface Player {
    id: string;
    name: string;
    avatar: string;
    data: PlayerData[];
    movesLeft: number;
    diceResult: number;
    actionsLeft: number;
    attributes: PlayerAttributes;
    stats: PlayerStats;
    inventory: GameObject[];
    spawnPoint?: Position;
    evasionAttempts?: number;
}

export interface BasicPlayer {
    name: string;
    avatar: string;
    attributes: PlayerAttributes;
}
