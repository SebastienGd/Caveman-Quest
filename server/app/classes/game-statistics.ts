import { filterMatrix, findTile } from '@app/utils/algorithms';
import { CombatEvent } from '@app/utils/constants/combat-events';
import { GameConstants } from '@app/utils/constants/game-constants';
import { GameEvent } from '@app/utils/constants/game-events';
import { GameMapEvent } from '@app/utils/constants/map-events';
import { isDoorTile, isPossiblyWalkableTile } from '@app/utils/game-checks';
import { TileBase } from '@common/interfaces/map';
import { GameObject, ObjectName } from '@common/interfaces/object';
import { Player } from '@common/interfaces/player';
import { Movement } from '@common/interfaces/position';
import { Game } from './game';

export class GameStatistics {
    private playerVisitedTiles: Map<string, TileBase[]> = new Map();
    private visitedTiles: TileBase[] = [];
    private interactedDoors: TileBase[] = [];
    private pickedUpObjects: Map<string, GameObject[]> = new Map();
    private playersThatHeldFlag: string[] = [];

    private startTime: Date;

    constructor(game: Game) {
        game.players.forEach((player) => {
            const spawnTile = findTile(game.map.tiles, player.spawnPoint);
            this.playerVisitedTiles.set(player.id, [spawnTile]);
            player.stats.tilesVisitedPercentage = this.getTilePercentage(game, this.playerVisitedTiles.get(player.id), isPossiblyWalkableTile);
            this.pickedUpObjects.set(player.id, []);
            this.visitedTiles.push(spawnTile);
        });

        this.handleGameEvents(game);
    }

    private handleGameEvents(game: Game) {
        this.handleGameTime(game);
        this.handleNewTurn(game);
        this.handleMovePlayer(game);
        this.handlePickUpObject(game);
        this.handleDoorInteraction(game);
        this.handleCombatStart(game);
        this.handleAttackResult(game);
        this.handleCombatEndProcessing(game);
    }

    private handleGameTime(game: Game) {
        game.on(GameEvent.NewGame, () => {
            this.startTime = new Date();
        });

        game.on(GameEvent.EndGame, (winner: Player | null) => {
            if (winner || !winner) {
                const endTime = new Date();
                if (!this.startTime) return;
                const durationInSeconds = Math.floor((endTime.getTime() - this.startTime.getTime()) / GameConstants.Second);
                game.stats.duration = durationInSeconds;
                game.stats.nbTurns += 1;
            }
        });

        game.on(GameEvent.EndGameCTF, (winners: Player[]) => {
            if (winners) {
                const endTime = new Date();
                if (!this.startTime) return;
                const durationInSeconds = Math.floor((endTime.getTime() - this.startTime.getTime()) / GameConstants.Second);
                game.stats.duration = durationInSeconds;
                game.stats.nbTurns += 1;
            }
        });
    }

    private handleNewTurn(game: Game) {
        game.on(GameEvent.NewTurn, () => {
            game.stats.nbTurns++;
        });
    }

    private handleMovePlayer(game: Game) {
        game.on(GameEvent.MovePlayer, (movement: Movement) => {
            const playerVisitedTiles = this.playerVisitedTiles.get(game.activePlayer.player.id);
            const destinationTile = findTile(game.map.tiles, movement.destination);

            if (!playerVisitedTiles.includes(destinationTile)) {
                playerVisitedTiles.push(destinationTile);
                game.activePlayer.player.stats.tilesVisitedPercentage = this.getTilePercentage(game, playerVisitedTiles, isPossiblyWalkableTile);
                if (!this.visitedTiles.includes(destinationTile)) {
                    this.visitedTiles.push(destinationTile);
                    game.stats.tilesVisitedPercentage = this.getTilePercentage(game, this.visitedTiles, isPossiblyWalkableTile);
                }
            }
        });
    }

    private handlePickUpObject(game: Game) {
        game.on(GameEvent.PickUpObject, (object: GameObject) => {
            const playerPickedObjects = this.pickedUpObjects.get(game.activePlayer.player.id);
            if (playerPickedObjects.some((o) => o.name === object.name)) return;
            playerPickedObjects.push(object);
            game.activePlayer.player.stats.nbrOfPickedUpObjects++;
            if (object.name === ObjectName.Flag && !this.playersThatHeldFlag.includes(game.activePlayer.player.id)) {
                this.playersThatHeldFlag.push(game.activePlayer.player.id);
                game.stats.nbPlayersHeldFlag++;
            }
        });
    }

    private handleDoorInteraction(game: Game) {
        game.map.on(GameMapEvent.DoorInteraction, (door: TileBase) => {
            if (!this.interactedDoors.includes(door)) {
                this.interactedDoors.push(door);
                game.stats.doorInteractedPercentage = this.getTilePercentage(game, this.interactedDoors, isDoorTile);
            }
        });
    }

    private handleCombatStart(game: Game) {
        game.combat.on(CombatEvent.CombatStart, () => {
            game.combat.activePlayer.stats.combat++;
            game.combat.inactivePlayer.stats.combat++;
        });
    }

    private handleAttackResult(game: Game) {
        game.combat.on(CombatEvent.SuccessfulAttack, (effectiveDamage: number) => {
            game.combat.activePlayer.stats.damageDone += effectiveDamage;
            game.combat.inactivePlayer.stats.lostHP += effectiveDamage;
        });
    }

    private handleCombatEndProcessing(game: Game) {
        game.combat.on(CombatEvent.ProcessingCombatEnd, (won: boolean) => {
            if (won) {
                game.combat.activePlayer.stats.victories++;
                game.combat.inactivePlayer.stats.defeats++;
            } else {
                game.combat.activePlayer.stats.evasions++;
            }
        });
    }

    private getTilePercentage(game: Game, visited: TileBase[], filterCondition: (tile: TileBase) => boolean): number {
        const totalTiles = filterMatrix(game.map.tiles, filterCondition);
        const percentage = (visited.length / totalTiles.length) * GameConstants.Percent;
        return parseFloat(percentage.toFixed(2));
    }
}
