import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { routeAnimation } from '@app/animations/route-animation';
import { NotificationPopupComponent } from '@app/components/notification-popup/notification-popup.component';
import { SocketClientService } from '@app/services/socket-client.service';
import { RoomEvent } from '@common/constants/room-events';
import { WebRoute } from '@common/constants/web-routes';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet, NotificationPopupComponent],
    animations: [routeAnimation],
})
export class AppComponent {
    constructor(
        private socketService: SocketClientService,
        private router: Router,
    ) {
        this.socketService.on(RoomEvent.RedirectTo, (route: WebRoute) => {
            this.router.navigate([route]);
        });
    }
    prepareRoute(outlet: RouterOutlet) {
        return outlet?.activatedRouteData?.['animation'];
    }
}
