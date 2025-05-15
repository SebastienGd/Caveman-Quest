import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DescriptionPopupComponent } from '@app/components/description-popup/description-popup.component';
import { Map, TileBase } from '@common/interfaces/map';
import { TYPE_TO_DESCRIPTION } from 'src/utils/constants/description-constants';
@Component({
    selector: 'app-map',
    imports: [CommonModule, DescriptionPopupComponent],
    templateUrl: './map.component.html',
    styleUrl: './map.component.scss',
})
export class MapComponent {
    @Input() map: Map;
    @Input() shownDetailType?: 'description' | 'object';
    @Input() interactionMode?: 'click' | 'drag';

    @Output() tileRightClick = new EventEmitter<TileBase>();
    @Output() tileLeftClick = new EventEmitter<TileBase>();
    @Output() tileDrop = new EventEmitter<TileBase>();
    @Output() tileMove = new EventEmitter<TileBase>();
    @Output() stopInteraction = new EventEmitter();
    @Output() objectRightClick = new EventEmitter<TileBase>();
    @Output() objectDragStart = new EventEmitter<TileBase>();

    typeToDescription = TYPE_TO_DESCRIPTION; // to use in the html

    isHovered = false;
    tileClick(event: MouseEvent, tile: TileBase) {
        event.preventDefault();

        switch (event.buttons) {
            case 2:
                this.tileRightClick.emit(tile);
                break;
            case 1:
                this.tileLeftClick.emit(tile);
                break;
        }
    }
}
