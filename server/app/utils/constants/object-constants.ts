import { MapSize } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';

export const SIZE_TO_QUANTITY: { [size: number]: { [objectType: string]: number } } = {
    [MapSize.Small]: {
        [ObjectName.Flag]: 1,
        [ObjectName.Random]: 2,
        [ObjectName.Spawnpoint]: 2,
    },
    [MapSize.Medium]: {
        [ObjectName.Flag]: 1,
        [ObjectName.Random]: 4,
        [ObjectName.Spawnpoint]: 4,
    },
    [MapSize.Large]: {
        [ObjectName.Flag]: 1,
        [ObjectName.Random]: 6,
        [ObjectName.Spawnpoint]: 6,
    },
} as const;
