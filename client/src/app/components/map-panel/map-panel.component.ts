import { Component, Input, OnInit } from '@angular/core';
import { MapCardSelectComponent } from '@app/components/map-card-select/map-card-select.component';
import { MapCardComponent } from '@app/components/map-card/map-card.component';
import { ServerFetchService } from '@app/services/server-fetch.service';
import { Map } from '@common/interfaces/map';
import adminConstants from 'src/utils/constants/admin-constants';

@Component({
    selector: 'app-map-panel',
    imports: [MapCardComponent, MapCardSelectComponent],
    templateUrl: './map-panel.component.html',
    styleUrl: './map-panel.component.scss',
})
export class MapPanelComponent implements OnInit {
    @Input() maps: Map[] = [];
    @Input() cardType: string;

    currentIndex = 0;

    constructor(private serverFetchService: ServerFetchService) {}

    get displayedMaps() {
        return this.maps.slice(this.currentIndex, this.currentIndex + adminConstants.mapsPerPage);
    }

    handleMapDeleted() {
        this.serverFetchService.getMaps().subscribe({
            next: (maps) => {
                this.maps = maps;

                if (this.currentIndex >= this.maps.length) {
                    this.currentIndex = Math.max(0, this.currentIndex - adminConstants.mapsPerPage);
                }
            },
        });
    }

    async ngOnInit() {
        this.serverFetchService.getMaps().subscribe({
            next: (maps) => {
                this.maps = maps;
                if (this.cardType !== 'admin') {
                    this.maps = this.maps.filter((map) => map.visibility);
                }
            },
        });
    }

    prevPage() {
        if (this.currentIndex > 0) {
            this.currentIndex -= adminConstants.mapsPerPage;
        }
    }

    nextPage() {
        if (this.currentIndex + adminConstants.mapsPerPage < this.maps.length) {
            this.currentIndex += adminConstants.mapsPerPage;
        }
    }
}
