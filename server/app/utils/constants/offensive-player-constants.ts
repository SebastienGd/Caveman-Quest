import { ObjectName } from '@common/interfaces/object';

export const OFFENSIVE_ITEM_PRIORITY: { [objectType: string]: number } = {
    [ObjectName.Flag]: 7,
    [ObjectName.Bird]: 6,
    [ObjectName.ClubWeapon]: 5,
    [ObjectName.Bone]: 4,
    [ObjectName.Steak]: 3,
    [ObjectName.Torch]: 2,
    [ObjectName.Trex]: 1,
} as const;
