import { ObjectName } from '@common/interfaces/object';

export const OBJECT_NAME_TRANSLATIONS: Record<ObjectName, string> = {
    [ObjectName.Steak]: 'Steak',
    [ObjectName.ClubWeapon]: 'Massue',
    [ObjectName.Torch]: 'Torche',
    [ObjectName.Bone]: 'Os',
    [ObjectName.Trex]: 'T-Rex',
    [ObjectName.Bird]: 'Ptérodactyle',
    [ObjectName.Random]: '',
    [ObjectName.Flag]: 'Drapeau',
    [ObjectName.Spawnpoint]: '',
};

export const translateObjectName = (objectName: ObjectName): string => {
    return OBJECT_NAME_TRANSLATIONS[objectName];
};
