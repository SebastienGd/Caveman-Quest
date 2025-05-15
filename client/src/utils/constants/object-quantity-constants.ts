import { MapSize } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';

export const SIZE_TO_QUANTITY: { [size in number]: { [objectName in string]: number } } = {
    [MapSize.Small]: {
        [ObjectName.Steak]: 1,
        [ObjectName.ClubWeapon]: 1,
        [ObjectName.Torch]: 1,
        [ObjectName.Bone]: 1,
        [ObjectName.Trex]: 1,
        [ObjectName.Bird]: 1,
        [ObjectName.Random]: 2,
        [ObjectName.Flag]: 1,
        [ObjectName.Spawnpoint]: 2,
    },

    [MapSize.Medium]: {
        [ObjectName.Steak]: 1,
        [ObjectName.ClubWeapon]: 1,
        [ObjectName.Torch]: 1,
        [ObjectName.Bone]: 1,
        [ObjectName.Trex]: 1,
        [ObjectName.Bird]: 1,
        [ObjectName.Random]: 4,
        [ObjectName.Flag]: 1,
        [ObjectName.Spawnpoint]: 4,
    },

    [MapSize.Large]: {
        [ObjectName.Steak]: 1,
        [ObjectName.ClubWeapon]: 1,
        [ObjectName.Torch]: 1,
        [ObjectName.Bone]: 1,
        [ObjectName.Trex]: 1,
        [ObjectName.Bird]: 1,
        [ObjectName.Random]: 6,
        [ObjectName.Flag]: 1,
        [ObjectName.Spawnpoint]: 6,
    },
} as const;
