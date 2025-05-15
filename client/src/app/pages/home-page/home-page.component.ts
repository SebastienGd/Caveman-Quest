import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@app/components/button/button.component';
import { SocketClientService } from '@app/services/socket-client.service';
import { RoomEvent } from '@common/constants/room-events';

@Component({
    selector: 'app-home-page',
    templateUrl: './home-page.component.html',
    styleUrls: ['./home-page.component.scss'],
    imports: [RouterLink, ButtonComponent],
})
export class HomePageComponent implements OnInit {
    readonly title: string = 'La Guerre des Âges';
    readonly teamNumber: string = 'Équipe #205';
    readonly teamMembers: string[] = ['Sarah Ait-Ali-Yahia', 'Simon Asmar', 'Jordan Filion', 'Sébastien Girard', 'Rami Medjdoubi', 'Cerine Ouchene'];
    constructor(private socketService: SocketClientService) {}
    ngOnInit() {
        this.socketService.send(RoomEvent.Quit);
    }
}
