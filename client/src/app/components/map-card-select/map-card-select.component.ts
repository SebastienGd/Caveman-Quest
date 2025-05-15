import { Component, Injectable, Input, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { ErrorPopupComponent } from '@app/components/error-popup/error-popup.component';
import { MapComponent } from '@app/components/map/map.component';
import { ServerFetchService } from '@app/services/server-fetch.service';
import { SIZE_TO_PLAYER_COUNT } from '@common/constants/map-constants';
import { WebRoute } from '@common/constants/web-routes';
import { GameMode, Map } from '@common/interfaces/map';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-map-card-select',
    imports: [ButtonComponent, MapComponent, ErrorPopupComponent],
    templateUrl: './map-card-select.component.html',
    styleUrl: './map-card-select.component.scss',
})
@Injectable({
    providedIn: 'root',
})
export class MapCardSelectComponent implements OnDestroy {
    @Input() map: Map;
    gameMode = GameMode;
    errorMessage: string = '';
    showErrorPopup: boolean = false;
    sizeToPlayerCount = SIZE_TO_PLAYER_COUNT; // to use in the html
    private ngUnsubscribe = new Subject<void>();

    constructor(
        private serverFetchService: ServerFetchService,
        private router: Router,
    ) {}

    isMapAvailable(mapId: string) {
        this.serverFetchService
            .getMap(mapId)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe({
                next: (selectedMap: Map) => {
                    if (selectedMap && selectedMap.visibility) {
                        this.router.navigate([WebRoute.CharacterSelection], { queryParams: { id: mapId } });
                    } else {
                        this.errorMessage = "Cette carte de jeu n'est plus disponible.";
                        this.showErrorPopup = true;
                    }
                },
            });
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }
}
