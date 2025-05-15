import { ObjectName } from '@common/interfaces/object';

export const DEFENSIVE_ITEM_PRIORITY: { [objectType: string]: number } = {
    [ObjectName.Flag]: 7,
    [ObjectName.Bird]: 6,
    [ObjectName.Steak]: 5,
    [ObjectName.Bone]: 4,
    [ObjectName.Torch]: 3,
    [ObjectName.Trex]: 2,
    [ObjectName.ClubWeapon]: 1,
} as const;
