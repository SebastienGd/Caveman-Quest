import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { ChoiceModalComponent } from '@app/components/choice-modal/choice-modal.component';
import { DescriptionPopupComponent } from '@app/components/description-popup/description-popup.component';
import { ErrorPopupComponent } from '@app/components/error-popup/error-popup.component';
import { MapComponent } from '@app/components/map/map.component';
import { EditGameService } from '@app/services/edit-game.service';
import { ServerFetchService } from '@app/services/server-fetch.service';
import { WebRoute } from '@common/constants/web-routes';
import { GameMode, TileBase, TileType } from '@common/interfaces/map';
import { ObjectName } from '@common/interfaces/object';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TYPE_TO_DESCRIPTION } from 'src/utils/constants/description-constants';

@Component({
    selector: 'app-edit-game-page',
    imports: [ButtonComponent, FormsModule, MapComponent, DescriptionPopupComponent, ErrorPopupComponent, ChoiceModalComponent],
    templateUrl: './edit-game-page.component.html',
    styleUrl: './edit-game-page.component.scss',
})
export class EditGamePageComponent implements OnInit, OnDestroy {
    // gameMode,tileType,typeToDescription,objectNames,tileNames are public to be able to use them in the html
    gameMode = GameMode;
    tileType = TileType;
    typeToDescription = TYPE_TO_DESCRIPTION;
    objectNames = Object.values(ObjectName);
    tileNames = Object.values(TileType);
    errors: string[] = [];
    showChoicePopup: boolean = false;
    private ngUnsubscribe = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private serverFetchService: ServerFetchService,
        public editGameService: EditGameService,
    ) {}

    ngOnInit() {
        this.editGameService.activeTile = null;
        localStorage.removeItem('map');
        this.route.queryParams.pipe(takeUntil(this.ngUnsubscribe)).subscribe((params) => {
            const id = params['id'];
            const size = params['size'];
            const mode = params['mode'];
            this.editGameService.fetchMap(id, size, mode);
        });
    }

    handleResetConfirm() {
        this.showChoicePopup = false;
        this.editGameService.fetchMap();
    }

    handleCancelClick() {
        this.router.navigate([WebRoute.Admin]);
    }

    handleSaveClick() {
        this.errors = [];
        this.serverFetchService.updateOrCreateMap(this.editGameService.map).subscribe({
            next: async () => this.router.navigate([WebRoute.Admin]),
            error: (err) => {
                this.errors = err.error.content ? err.error.content : ["Une erreur est survenue, mais aucun détail n'a été fourni."];
            },
        });
    }

    changeTool(tileType: TileType) {
        this.editGameService.activeTile = this.editGameService.activeTile === tileType ? null : tileType;
    }

    deleteObject(tile: TileBase) {
        tile.object = undefined;
    }

    dragTile(tile: TileBase | null) {
        this.editGameService.draggedTileWithObject = tile;
    }

    dragObject = (objectName: ObjectName) => {
        const object = { name: objectName };
        if (object) {
            this.editGameService.draggedTileWithObject = { object, type: TileType.Base };
        }
    };

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
        this.ngUnsubscribe.unsubscribe();
    }
}
