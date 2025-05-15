import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { SocketClientService } from '@app/services/socket-client.service';
import { CharacterEvent } from '@common/constants/character-events';
import { WebRoute } from '@common/constants/web-routes';

@Component({
    selector: 'app-join-page',
    imports: [FormsModule, ButtonComponent],
    templateUrl: './join-page.component.html',
    styleUrl: './join-page.component.scss',
})
export class JoinPageComponent {
    code: string = '';
    constructor(
        private socketService: SocketClientService,
        private router: Router,
    ) {}

    handleBackClick(): void {
        this.router.navigate([WebRoute.Home]);
    }

    tryJoinGame() {
        this.socketService.socket.emit(CharacterEvent.JoinGameWithCode, this.code);
    }
}
