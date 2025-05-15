import { TileType } from './../interfaces/map';

export const TILE_TYPE_TO_COST: { [tileType in TileType]: number } = {
    [TileType.Ice]: 0,
    [TileType.Base]: 1,
    [TileType.OpenedDoor]: 1,
    [TileType.Water]: 2,
    [TileType.ClosedDoor]: 1000000,
    [TileType.Wall]: Infinity,
} as const;

export enum CostConstants{
    TileCost = 0.0000001,
    TileCostAcceptance = 0.1,
    PlayerCost = 1000000000,
}