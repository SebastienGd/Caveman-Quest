import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from 'src/app/components/button/button.component';

@Component({
    selector: 'app-error-popup',
    imports: [ButtonComponent],
    templateUrl: './error-popup.component.html',
    styleUrl: './error-popup.component.scss',
})
export class ErrorPopupComponent {
    @Input() errors: string[] = [];
    @Input() errorType: string = 'saveError';
    @Output() popupClose = new EventEmitter<void>();

    closePopup() {
        this.popupClose.emit();
    }
}
