import { ObjectName } from '@common/interfaces/object';
import { PlayerData } from '@common/interfaces/player';
import { mockPlayers } from 'src/tests/mock-players';
import { PlayerListComponent } from './player-list.component';

describe('PlayerListComponent', () => {
    let component: PlayerListComponent;

    beforeEach(() => {
        component = new PlayerListComponent();

        component.players = [mockPlayers[0]];
        component.activePlayerName = mockPlayers[0].name;
        component.organizerName = 'Org';
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have proper inputs set', () => {
        expect(component.players.length).toBe(1);
        expect(component.players[0].name).toBe('RAMI');
        expect(component.activePlayerName).toBe('RAMI');
        expect(component.organizerName).toBe('Org');
    });

    it('should expose PlayerData enum', () => {
        expect(component.playerData).toBe(PlayerData);
    });
    it('should return true if player has the Flag in inventory', () => {
        const playerWithFlag = {
            ...mockPlayers[0],
            inventory: [{ name: ObjectName.Flag }],
        };
        expect(component.playerHasFlag(playerWithFlag)).toBeTrue();
    });

    it('should return false if player does not have the Flag in inventory', () => {
        const playerWithoutFlag = {
            ...mockPlayers[0],
            inventory: [{ name: ObjectName.Torch }],
        };
        expect(component.playerHasFlag(playerWithoutFlag)).toBeFalse();
    });
});
