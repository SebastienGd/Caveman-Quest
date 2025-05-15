import { Map } from './map';
import { Player } from './player';

export interface GameBase {
    code: string;
    map: Map;
    players: Player[];
    data: GameData;
    stats: GameStats;
}

export interface GameData {
    debugging: boolean;
    transitioning: boolean;
    turnIsEnding: boolean;
    isSelectingObject?: boolean;
    gameIsOver: boolean;
}

export interface GameStats {
    duration: number;
    nbTurns: number;
    doorInteractedPercentage: number;
    tilesVisitedPercentage: number;
    nbPlayersHeldFlag: number;
}