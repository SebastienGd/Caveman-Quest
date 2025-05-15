import { TileType } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { AttributeName } from '@common/interfaces/player';

export const TYPE_TO_DESCRIPTION: { [type: string]: string } = {
    [TileType.Base]: 'La terre : Un sol préhistorique nécessitant 1 points de mouvement.',
    [TileType.Water]: "L'eau : Un terrain difficile nécessitant 2 points de mouvement.",
    [TileType.Ice]: 'La glace : Une surface glissante qui ne consomme aucun point de mouvement.',
    [TileType.Wall]: 'Le mur : un obstacle solide qui bloque le passage.',
    [TileType.ClosedDoor]: 'La porte : Ouverte coûte 1 point de mouvement. Fermée, elle bloque le passage.',
    [TileType.OpenedDoor]: 'La porte : Ouverte coûte 1 point de mouvement. Ouvert, elle permet le passage',

    [ObjectName.Steak]: 'Le steak : Augmente vie et défense',
    [ObjectName.ClubWeapon]: 'La massue : Augmente attaque et vitesse',
    [ObjectName.Torch]: "La torche : Augmente les dés à 6 si déplacé vers tuile d'eau",
    [ObjectName.Bone]: "L'os : Tue instantanément l'adversaire s'il te reste 1 point de vie en combat",
    [ObjectName.Trex]: "Le T-rex : Empêche l'adversaire de gagner en cas de défaite",
    [ObjectName.Bird]: 'Le Pterodactyle : Déplace-toi librement!',
    [ObjectName.Random]: "L'objet aléatoire : Surprise!",
    [ObjectName.Flag]: 'Le drapeau : À protéger',
    [ObjectName.Spawnpoint]: "Point d'apparition : Le début",

    [AttributeName.Health]: 'Augmente vos points de vie et votre endurance en combat.',
    [AttributeName.Attack]: 'Détermine la puissance de vos offensives.',
    [AttributeName.Speed]: "Définit l'ordre des tours et le nombre de déplacements par tour.",
    [AttributeName.Defense]: 'Augmente votre capacité à bloquer les attaques ennemies.',
} as const;
