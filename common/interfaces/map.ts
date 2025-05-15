import { GameObject } from './object';
import { Player } from './player';
export enum MapSize {
    Small = 10,
    Medium = 15,
    Large = 20,
}

export enum TileType {
    Base = 'base',
    Water = 'water',
    Ice = 'ice',
    Wall = 'wall',
    OpenedDoor = 'opened_door',
    ClosedDoor = 'closed_door',
}

export enum TileData {
    Accessible = 'accessible',
    PlayerInProximity = 'playerInProximity',
    DoorInProximity = 'doorInProximity',
    InvalidTile = 'invalidTile',
    FastestRoute = 'fastestRoute',
    SpawnPointIndicator = 'spawnpointIndicator',
}


export interface TileBase {
    type: TileType;
    player?: Player;
    object?: GameObject;
    data?: TileData[];
}

export enum GameMode {
    Ctf = 'Capture the Flag',
    Classical = 'Classical',
}

export interface Map {
    _id: string;
    name: string;
    description: string;
    mode: GameMode;
    size: number;
    tiles: TileBase[][];
    createdAt: string;
    updatedAt: string;
    visibility: boolean;
}

