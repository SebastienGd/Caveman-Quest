import { MapSize } from "./../interfaces/map";
type Range = { min: number; max: number };

export const SIZE_TO_PLAYER_COUNT: { [size in number]: Range } = {
    [MapSize.Small]: { min: 2, max: 2 },
    [MapSize.Medium]: { min: 2, max: 4 },
    [MapSize.Large]: { min: 2, max: 6 },
} as const;