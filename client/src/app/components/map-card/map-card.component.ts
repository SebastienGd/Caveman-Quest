import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorPopupComponent } from '@app/components/error-popup/error-popup.component';
import { MapComponent } from '@app/components/map/map.component';
import { ServerFetchService } from '@app/services/server-fetch.service';
import { WebRoute } from '@common/constants/web-routes';
import { Map } from '@common/interfaces/map';

@Component({
    selector: 'app-map-card',
    imports: [MapComponent, ErrorPopupComponent],
    providers: [DatePipe],
    templateUrl: './map-card.component.html',
    styleUrl: './map-card.component.scss',
})
export class MapCardComponent {
    @Input() map!: Map;
    @Output() mapDeleted = new EventEmitter<void>();

    isHovered = false;
    showDeleteConfirmation = false;
    errorDeletedPopup = false;

    constructor(
        private serverFetchService: ServerFetchService,
        private router: Router,
        private datePipe: DatePipe,
    ) {}

    formatDate(dateString: string): string {
        return this.datePipe.transform(dateString, 'MM/dd/yy, HH:mm') || '';
    }

    toggleVisibility() {
        const newVisibility = !this.map.visibility;
        this.map.visibility = newVisibility;
        this.serverFetchService.setMapVisibility(this.map._id, newVisibility).subscribe();
        this.map.visibility = newVisibility;
    }

    editMap() {
        this.router.navigate([WebRoute.EditGame], { queryParams: { id: this.map._id } });
    }

    toggleDeletePopup() {
        this.showDeleteConfirmation = !this.showDeleteConfirmation;
    }

    async confirmDelete() {
        this.serverFetchService.deleteMap(this.map._id).subscribe({
            next: () => {
                this.mapDeleted.emit();
                this.showDeleteConfirmation = false;
            },
            error: () => {
                this.errorDeletedPopup = true;
            },
        });
    }

    cancelDelete() {
        this.showDeleteConfirmation = false;
    }
}
