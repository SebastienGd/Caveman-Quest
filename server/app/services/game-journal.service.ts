import { Game } from '@app/classes/game';
import { findTileCoordinates } from '@app/utils/algorithms';
import { CombatEvent } from '@app/utils/constants/combat-events';
import { COMBAT_CONSTANTS } from '@app/utils/constants/game-constants';
import { GameEvent } from '@app/utils/constants/game-events';
import { JournalMessages } from '@app/utils/constants/journal-messages';
import { GameMapEvent } from '@app/utils/constants/map-events';
import { isPlayerInCombat } from '@app/utils/game-checks';
import { RoomEvent } from '@common/constants/room-events';
import { JournalMessage } from '@common/interfaces/journal-message';
import { TileBase, TileType } from '@common/interfaces/map';
import { GameObject, ObjectName } from '@common/interfaces/object';
import { Player, PlayerData } from '@common/interfaces/player';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { GameSocketService } from './game-socket.service';
import { RouteManager } from './routes-manager';

@Service()
export class GameJournalService {
    constructor(
        private gameSocketService: GameSocketService,
        private routeManager: RouteManager,
    ) {
        this.gameSocketService.on(GameEvent.NewGame, (game: Game) => {
            this.setupCombatEventHandlers(game);
            this.setupGameEventHandlers(game);

            const journalMessage1 = { content: JournalMessages.StartGame, players: [] } as JournalMessage;
            this.broadcastLogMessage(game, journalMessage1);
            const playerName = game.activePlayer.player.name;
            const message = `${playerName}${JournalMessages.TurnStart}`;
            const journalMessage2 = { content: message, players: [playerName] } as JournalMessage;
            this.broadcastLogMessage(game, journalMessage2);
        });
    }

    private setupGameEventHandlers(game: Game) {
        this.handleNewTurn(game);
        this.handleDisconnect(game);
        this.handleDoorInteraction(game);
        this.handleDebugModeChange(game);
        this.handlePickUpObject(game);
        this.handleEndGame(game);
        this.handleEndGameCTF(game);
    }

    private handleNewTurn(game: Game) {
        game.on(GameEvent.NewTurn, (nextPlayer: Player) => {
            const playerName = nextPlayer.name;
            const message = `${playerName}${JournalMessages.TurnStart}`;

            const journalMessage = {
                content: message,
                players: [playerName],
            } as JournalMessage;

            this.broadcastLogMessage(game, journalMessage);
        });
    }

    private handleDisconnect(game: Game) {
        game.on(GameEvent.Disconnect, (player: Player) => {
            if (!player) return;

            const message = `${player.name}${JournalMessages.Disconnect}`;

            const journalMessage = {
                content: message,
                players: [player.name],
            } as JournalMessage;

            this.broadcastLogMessage(game, journalMessage);
        });
    }

    private handleDoorInteraction(game: Game) {
        game.map.on(GameMapEvent.DoorInteraction, (door: TileBase) => {
            const pos = findTileCoordinates(game.map.tiles, door);
            const playerName = game.activePlayer.player.name;
            const action = door.type === TileType.OpenedDoor ? 'ouvert' : 'fermé';
            const message = `${playerName} a ${action} la porte aux coordonnées (${pos.x}, ${pos.y})`;

            const journalMessage = {
                content: message,
                players: [playerName],
            } as JournalMessage;

            this.broadcastLogMessage(game, journalMessage);
        });
    }

    private handleDebugModeChange(game: Game) {
        game.on(GameEvent.DebugModeChange, () => {
            const message = game.data.debugging ? JournalMessages.DebugIsOn : JournalMessages.DebugIsOff;

            const journalMessage = {
                content: message,
                players: [],
            } as JournalMessage;

            this.broadcastLogMessage(game, journalMessage);
        });
    }

    private handlePickUpObject(game: Game) {
        game.on(GameEvent.PickUpObject, (object: GameObject) => {
            const playerName = game.activePlayer.player.name;
            const message =
                object.name === ObjectName.Flag
                    ? `${playerName}${JournalMessages.PickUpFlag}`
                    : `${playerName}${JournalMessages.PickUpObject}${object.name}`;

            const journalMessage = {
                content: message,
                players: [playerName],
            } as JournalMessage;

            this.broadcastLogMessage(game, journalMessage);
        });
    }

    private handleEndGame(game: Game) {
        game.on(GameEvent.EndGame, () => {
            const winner = game.players.find((p) => p.stats.victories === COMBAT_CONSTANTS.victoryToWin);
            const winnerMessage = winner ? `${JournalMessages.EndGame}${winner.name}` : `${JournalMessages.EndGame}Aucun gagnant`;

            const journalMessage1 = {
                content: winnerMessage,
                players: winner ? [winner.name] : [],
            } as JournalMessage;

            const activePlayers = game.players.filter((p) => !p.data.includes(PlayerData.Disconnected)).map((p) => p.name);

            const activePlayersMessage = `${JournalMessages.ActivePlayerList}${activePlayers.join(', ')}`;

            const journalMessage2 = {
                content: activePlayersMessage,
                players: activePlayers,
            } as JournalMessage;

            setTimeout(() => {
                this.broadcastLogMessage(game, journalMessage1);
                this.broadcastLogMessage(game, journalMessage2);
            }, 1);
        });
    }

    private handleEndGameCTF(game: Game) {
        game.on(GameEvent.EndGameCTF, (winners: Player[]) => {
            const winnersNames = winners.map((p) => p.name).join(', ');
            const winnerMessage = `${JournalMessages.EndGameCTF}${winnersNames}`;
            const journalMessage1 = { content: winnerMessage, players: winners.map((p) => p.name) } as JournalMessage;

            const activePlayers = game.players.filter((p) => !p.data.includes(PlayerData.Disconnected)).map((p) => p.name);
            const activePlayersMessage = `${JournalMessages.ActivePlayerList}${activePlayers.join(', ')}`;
            const journalMessage2 = { content: activePlayersMessage, players: activePlayers } as JournalMessage;

            setTimeout(() => {
                this.broadcastLogMessage(game, journalMessage1);
                this.broadcastLogMessage(game, journalMessage2);
            }, 1);
        });
    }

    private setupCombatEventHandlers(game: Game) {
        this.handleCombatStart(game);
        this.handleAttackResult(game);
        this.handleEvadeResult(game);
        this.handleCombatEnd(game);
    }

    private handleCombatStart(game: Game) {
        game.combat.on(CombatEvent.CombatStart, () => {
            const activePlayerName = game.activePlayer.player.name;

            const inactivePlayerName = game.players.find(
                (player) => player.data.includes(PlayerData.Combat) && player.name !== activePlayerName,
            ).name;

            const message = `${activePlayerName}${JournalMessages.CombatStart}${inactivePlayerName}`;
            const journalMessage = { content: message, players: [activePlayerName, inactivePlayerName] } as JournalMessage;
            this.broadcastLogMessage(game, journalMessage);
        });
    }

    private handleAttackResult(game: Game) {
        game.combat.on(CombatEvent.AttackResult, (totalAttack: number, totalDefense: number, effectiveDamage: number) => {
            const attacker = game.combat.activePlayer;
            const defender = game.combat.inactivePlayer;
            const message =
                `${attacker.name} attaque ${defender.name}; ` +
                `${attacker.name} roule ${attacker.diceResult}, ${defender.name} roule ${defender.diceResult}; ` +
                `Attaque: ${totalAttack}, Défense: ${totalDefense}; ` +
                `Résultat: ${effectiveDamage} → ${effectiveDamage > 0 ? 'Réussite' : 'Échec'}`;
            const journalMessage = { content: message, players: [attacker.name, defender.name] } as JournalMessage;
            this.broadcastLogMessage(game, journalMessage, true);
        });
    }

    private handleEvadeResult(game: Game) {
        game.combat.on(CombatEvent.EvadeResult, (result: number, evadeSuccessful: boolean) => {
            const outcome = evadeSuccessful ? 'réussie' : 'échouée';
            const formattedValue = result.toFixed(2);
            const symbol = evadeSuccessful ? '✅' : '❌';
            const activePlayerName = game.combat.activePlayer.name;
            const message = `Tentative d'évasion de ${activePlayerName} (${outcome}) : ${formattedValue} < 0.3 ${symbol}`;
            const journalMessage = { content: message, players: [activePlayerName] } as JournalMessage;
            this.broadcastLogMessage(game, journalMessage, true);
        });
    }

    private handleCombatEnd(game: Game) {
        game.combat.on(CombatEvent.CombatEnd, (won: boolean) => {
            const attackerName = game.combat.activePlayer.name;
            const defenderName = game.combat.inactivePlayer.name;

            const detail = won
                ? `${attackerName}${JournalMessages.CombatWin}${defenderName}`
                : `${attackerName}${JournalMessages.CombatEvade}${defenderName}`;

            const journalMessage = { content: `${JournalMessages.CombatEnd}${detail}`, players: [attackerName, defenderName] } as JournalMessage;
            this.broadcastLogMessage(game, journalMessage);
        });
    }

    private broadcastLogMessage(game: Game, journalMessage: JournalMessage, toCombatPlayersOnly: boolean = false) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString('en-CA', {
            timeZone: 'America/Toronto',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
        journalMessage.content = `${timestamp} ${journalMessage.content}`;

        const payload = journalMessage;

        if (toCombatPlayersOnly) {
            const playerInCombat = (socket: Socket) => isPlayerInCombat(game.combat, socket.id);
            this.routeManager.broadcastTo(game.code, RoomEvent.JournalMessage, playerInCombat, payload);
        } else {
            this.routeManager.broadcastToGameRoom(game.code, RoomEvent.JournalMessage, payload);
        }
    }
}
