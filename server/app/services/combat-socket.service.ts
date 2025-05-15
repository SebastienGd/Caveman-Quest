import { Game } from '@app/classes/game';
import { CombatEvent } from '@app/utils/constants/combat-events';
import { GameEvent } from '@app/utils/constants/game-events';
import { TimerEvent } from '@app/utils/constants/timer-events';
import { isActiveCombatPlayer, isPlayerInCombat } from '@app/utils/game-checks';
import { GameRoomEvent } from '@common/constants/game-room-events';
import { RoomEvent } from '@common/constants/room-events';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { GameSocketService } from './game-socket.service';
import { RouteManager } from './routes-manager';

@Service()
export class CombatSocketService {
    constructor(
        private gameSocketService: GameSocketService,
        private routeManager: RouteManager,
    ) {
        this.gameSocketService.on(GameEvent.NewGame, (game: Game) => {
            this.setupCombatEventHandlers(game);
        });
    }

    setupEventHandlers(socket: Socket): void {
        this.handleSocketCombatStart(socket);
        this.handleSocketAttackAction(socket);
        this.handleSocketEvadeAction(socket);
    }

    handleDisconnecting(socket: Socket) {
        const game = this.getGameIfInCombat(socket, false);
        if (!game) return;
        game.combat.disconnectPlayer(socket.id);
    }

    private handleSocketCombatStart(socket: Socket): void {
        this.gameSocketService.handlerWrapper(socket, GameRoomEvent.InitiateCombat, (game: Game, defenderId: string) => {
            game.combat.startCombat(game, socket.id, defenderId);
        });
    }

    private handleSocketEvadeAction(socket: Socket) {
        this.handlerWrapper(socket, GameRoomEvent.EvadeAction, (game: Game) => {
            game.combat.evade();
        });
    }

    private handleSocketAttackAction(socket: Socket) {
        this.handlerWrapper(socket, GameRoomEvent.AttackAction, (game: Game) => {
            game.combat.attack();
        });
    }

    private setupCombatEventHandlers(game: Game): void {
        this.handleCombatEnd(game);
        this.handleCombatStart(game);
        this.handleTimer(game);
        this.handleCombatChange(game);
    }

    private handleCombatEnd(game: Game) {
        game.combat.on(CombatEvent.CombatEnd, (won: boolean) => {
            const winner = game.combat.activePlayer;
            const winnerSocket = (socket: Socket) => socket.id === winner.id;
            const loserSocket = (socket: Socket) => socket.id === game.combat.inactivePlayer.id;
            this.routeManager.broadcastTo(game.code, RoomEvent.Notify, winnerSocket, `Vous avez ${won ? 'gagné' : 'fuit'} le combat`);
            this.routeManager.broadcastTo(game.code, RoomEvent.Notify, loserSocket, `${winner.name} ${won ? 'a gagné' : 'a fuit'} le combat`);
        });
    }

    private handleCombatStart(game: Game) {
        const socketsOutOfCombat = (s: Socket) => !isPlayerInCombat(game.combat, s.id);
        game.combat.on(CombatEvent.CombatStart, () =>
            this.routeManager.broadcastTo(game.code, GameRoomEvent.TimerValue, socketsOutOfCombat, 'En combat'),
        );
    }
    private handleCombatChange(game: Game) {
        const socketsInCombat = (s: Socket) => isPlayerInCombat(game.combat, s.id);
        game.combat.on(CombatEvent.ChangeTurn, () =>
            this.routeManager.broadcastTo(game.code, GameRoomEvent.UpdateGame, socketsInCombat, game.toGameBase()),
        );
    }

    private handleTimer(game: Game) {
        const socketsInCombat = (s: Socket) => isPlayerInCombat(game.combat, s.id);
        game.combat.timer.on(TimerEvent.NewTime, () => {
            this.routeManager.broadcastTo(game.code, GameRoomEvent.TimerValue, socketsInCombat, game.combat.timer.time);
        });
    }

    private getGameIfInCombat(socket: Socket, validatePlayer: boolean = true): Game | null {
        const game = this.gameSocketService.getGame(socket.data);
        if (!game || (validatePlayer && !isActiveCombatPlayer(game.combat, socket.id)) || !isPlayerInCombat(game.combat, socket.id)) {
            return null;
        }
        return game;
    }

    private handlerWrapper(socket: Socket, event: string, callback: (...args: unknown[]) => void) {
        this.routeManager.onWrapper(event, socket, (...args: unknown[]) => {
            const game = this.getGameIfInCombat(socket);
            if (!game) return;
            callback(game, ...args);
        });
    }
}
