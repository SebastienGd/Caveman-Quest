import { TileBase } from "./map";

export type Position = {
    x: number;
    y: number;
};

export interface PositionedTile extends Position {
    tile: TileBase;
    y: number;
    x: number;
    cost: number;
    parent?: PositionedTile;
}

export interface Movement {
    start: Position;
    destination: Position;
}