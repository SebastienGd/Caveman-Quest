import { provideHttpClient } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Routes, provideRouter, withHashLocation } from '@angular/router';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';
import { AppComponent } from '@app/pages/app/app.component';
import { CharacterSelectionPageComponent } from '@app/pages/character-selection-page/character-selection-page.component';
import { CreateGamePageComponent } from '@app/pages/create-game-page/create-game-page.component';
import { EditGamePageComponent } from '@app/pages/edit-game-page/edit-game-page.component';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { HomePageComponent } from '@app/pages/home-page/home-page.component';
import { JoinPageComponent } from '@app/pages/join-page/join-page.component';
import { StatsPageComponent } from '@app/pages/stats-page/stats-page.component';
import { WaitingRoomPageComponent } from '@app/pages/waiting-room-page/waiting-room-page.component';
import { WebRoute } from '@common/constants/web-routes';
import { GameModeComponent } from './app/pages/game-mode-page/game-mode.component';
import { GameSizePageComponent } from './app/pages/game-size-page/game-size-page.component';
import { environment } from './environments/environment';
if (environment.production) {
    enableProdMode();
}

const routes: Routes = [
    { path: '', redirectTo: WebRoute.EditGame, pathMatch: 'full' },

    { path: WebRoute.Home, component: HomePageComponent, data: { animation: 'Home' } },
    { path: WebRoute.Join, component: JoinPageComponent, data: { animation: 'Join' } },
    { path: WebRoute.Admin, component: AdminPageComponent, data: { animation: 'Admin' } },
    { path: WebRoute.EditGame, component: EditGamePageComponent, data: { animation: 'EditGame' } },
    { path: WebRoute.GamePage, component: GamePageComponent, data: { animation: 'Game' } },
    { path: WebRoute.GameMode, component: GameModeComponent, data: { animation: 'GameMode' } },
    { path: WebRoute.GameSize, component: GameSizePageComponent, data: { animation: 'GameSize' } },
    { path: WebRoute.CreateGame, component: CreateGamePageComponent, data: { animation: 'CreateGame' } },
    { path: WebRoute.CharacterSelection, component: CharacterSelectionPageComponent, data: { animation: 'CharacterSelection' } },
    { path: WebRoute.WaitingRoom, component: WaitingRoomPageComponent, data: { animation: 'WaitingRoom' } },
    { path: WebRoute.Stats, component: StatsPageComponent, data: { animation: 'StatsRoom' } },
    { path: '**', redirectTo: WebRoute.Home },
];

bootstrapApplication(AppComponent, {
    providers: [provideHttpClient(), provideRouter(routes, withHashLocation()), provideAnimations()],
});
