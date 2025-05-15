import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, Signal } from '@angular/core';
import { ButtonComponent } from '@app/components/button/button.component';
import { ChatBoxComponent } from '@app/components/chat-box/chat-box.component';
import { ChoiceModalComponent } from '@app/components/choice-modal/choice-modal.component';
import { GameBattleComponent } from '@app/components/game-battle/game-battle.component';
import { GameInformationComponent } from '@app/components/game-information/game-information.component';
import { InventoryChoiceComponent } from '@app/components/inventory-choice/inventory-choice.component';
import { MapComponent } from '@app/components/map/map.component';
import { PlayerInformationComponent } from '@app/components/player-information/player-information.component';
import { PlayerListComponent } from '@app/components/player-list/player-list.component';
import { TimerComponent } from '@app/components/timer/timer.component';
import { ChatService } from '@app/services/chat.service';
import { GameService } from '@app/services/game.service';
import { ChatMessage } from '@common/interfaces/chat-message';
import { GameBase } from '@common/interfaces/game';
import { JournalMessage } from '@common/interfaces/journal-message';
import { TileBase, TileData } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';
import { PlayerData } from '@common/interfaces/player';
import { TYPE_TO_DESCRIPTION } from 'src/utils/constants/description-constants';
import { translateObjectName } from 'src/utils/constants/object-translations';

@Component({
    selector: 'app-game-page',
    imports: [
        CommonModule,
        ChatBoxComponent,
        GameInformationComponent,
        PlayerInformationComponent,
        TimerComponent,
        ButtonComponent,
        GameBattleComponent,
        PlayerListComponent,
        MapComponent,
        ChoiceModalComponent,
        InventoryChoiceComponent,
    ],
    templateUrl: './game-page.component.html',
    styleUrl: './game-page.component.scss',
})
export class GamePageComponent implements OnInit {
    playerData = PlayerData;
    tileData = TileData;

    isQuitPopupVisible: boolean = false;
    selectedTile: TileBase | null = null;

    game: Signal<GameBase> = this.gameService.localGame.asReadonly();
    chatMessages: Signal<ChatMessage[]> = this.chatService.chatMessages.asReadonly();
    journalMessages: Signal<JournalMessage[]> = this.chatService.journalMessages.asReadonly();
    constructor(
        public gameService: GameService,
        public chatService: ChatService,
    ) {}

    @HostListener('document:keydown', ['$event'])
    handleKeydown(event: KeyboardEvent) {
        if (event.key === 'd' || event.key === 'D') {
            this.gameService.toggleDebugMode();
        }
    }

    ngOnInit() {
        this.gameService.refreshGame();
    }

    handleQuitGame() {
        this.isQuitPopupVisible = true;
    }

    closeQuitPopup(confirm: boolean) {
        this.isQuitPopupVisible = false;
        if (confirm) {
            this.gameService.disconnect();
        }
    }

    handleTileRightClick(tile: TileBase) {
        if (this.game().data.debugging) {
            if (tile.data?.includes(TileData.Accessible)) {
                this.gameService.movePlayer(tile);
            }
        } else {
            this.selectedTile = tile;
        }
    }

    handleTileLeftClick(tile: TileBase) {
        if (tile.data?.includes(TileData.PlayerInProximity)) {
            this.gameService.initiateCombat(tile);
        } else if (tile.data?.includes(TileData.DoorInProximity)) {
            this.gameService.interactDoor(tile);
        } else if (!this.game().data.debugging) {
            if (tile.data?.includes(TileData.FastestRoute) || (tile.data?.includes(TileData.Accessible) && this.playerHasBirdWithoutFlag())) {
                this.gameService.movePlayer(tile);
            }
        }
    }

    getTileDescription(tile: TileBase): string {
        let description = '';
        if (tile.player) {
            description += `Joueur : ${tile.player.name}<br>`;
            description += `Attaque : ${tile.player.attributes.attack.value}, Defense : ${tile.player.attributes.defense.value}<br>`;
            description += `Vie : ${tile.player.attributes.currentHealth}, Vitesse : ${tile.player.attributes.speed}<br>`;
            const inventoryItems =
                tile.player.inventory.length > 0 ? tile.player.inventory.map((object) => translateObjectName(object.name)).join(', ') : 'Aucun objet';
            description += `Inventaire : ${inventoryItems}<br>`;
        } else if (tile.object) {
            description += TYPE_TO_DESCRIPTION[tile.object.name] + '<br>';
        }
        return description + TYPE_TO_DESCRIPTION[tile.type];
    }

    tryShowFastestRoute(tileBase: TileBase) {
        if (!this.game().data.debugging && !this.playerHasBirdWithoutFlag()) {
            this.gameService.findFastestRoute(tileBase);
        }
    }

    private playerHasBirdWithoutFlag(): boolean {
        const playerHasBird = this.gameService.currentPlayer.inventory.some((object) => object.name === ObjectName.Bird);
        const playerHasFlag = this.gameService.currentPlayer.inventory.some((object) => object.name === ObjectName.Flag);
        return playerHasBird && !playerHasFlag;
    }
}
