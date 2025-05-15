import { Component, Input, OnInit } from '@angular/core';
import { GameService } from '@app/services/game.service';
import { TileBase } from '@common/interfaces/map';
import { GameObject } from '@common/interfaces/object';
import { ButtonComponent } from '@app/components/button/button.component';

@Component({
    selector: 'app-inventory-choice',
    imports: [ButtonComponent],
    templateUrl: './inventory-choice.component.html',
    styleUrl: './inventory-choice.component.scss',
})
export class InventoryChoiceComponent implements OnInit {
    @Input() tile: TileBase;
    constructor(public gameService: GameService) {}

    ngOnInit() {
        if (!this.tile.player || !this.tile.object) return;
    }

    manageInventory(deletedObject: GameObject) {
        if (!this.tile.player || !this.tile.object) return;
        this.gameService.selectObject(deletedObject.name);
        this.gameService.isInventoryPopupVisible = false;
    }
}
