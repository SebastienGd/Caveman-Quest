import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { CharacterService } from '@app/services/character.service';
import { WaitingRoomService } from '@app/services/waiting-room.service';
import { AttributeName } from '@common/interfaces/player';
import { WaitingRoom } from '@common/interfaces/waiting-room';
import { BehaviorSubject } from 'rxjs';
import characterConstants from 'src/utils/constants/character-constants';
import { CharacterSelectionPageComponent } from './character-selection-page.component';

describe('CharacterSelectionPageComponent', () => {
    let component: CharacterSelectionPageComponent;
    let fixture: ComponentFixture<CharacterSelectionPageComponent>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockCharacterService: jasmine.SpyObj<CharacterService>;
    let mockWaitingRoomService: jasmine.SpyObj<WaitingRoomService>;
    let mockRoute: jasmine.SpyObj<ActivatedRoute>;
    let queryParamsSubject: BehaviorSubject<{ id: string }>;

    let avatars: string[];

    beforeEach(async () => {
        mockCharacterService = jasmine.createSpyObj('CharacterService', [
            'selectAvatar',
            'quit',
            'joinWaitingRoom',
            'resetCharacter',
            'updateAttributeBonus',
            'areAttributesBonusValid',
            'areAttributesDiceValid',
            'onDragStart',
            'onDragOver',
            'onDrop',
            'resetCharacterRoom',
        ]);
        mockCharacterService.name = 'testName';

        mockWaitingRoomService = jasmine.createSpyObj('WaitingRoomService', [
            'resetRoom',
            'toggleLock',
            'kickPlayer',
            'playerQuit',
            'isGameLocked',
            'startGame',
            'roomStatus',
            'waitingRoom',
            'playerId',
            'canLockGame',
            'resetRoomStatus',
            'configure',
        ]);
        mockWaitingRoomService.waitingRoom = {
            selectedAvatars: {
                avatar1: 'avatar1',
                avatar2: 'avatar2',
            },
        } as unknown as WaitingRoom;

        queryParamsSubject = new BehaviorSubject<{ id: string }>({ id: 'testString' });
        mockRoute = jasmine.createSpyObj('ActivatedRoute', [], {
            queryParams: queryParamsSubject.asObservable(),
        });
        mockWaitingRoomService.roomStatus.and.returnValue({
            isLocked: true,
            message: '',
        });

        avatars = ['assets/images/homme1.png'];
        mockCharacterService.selectedAvatar = avatars[0];

        mockRouter = jasmine.createSpyObj(Router, ['navigate']);

        await TestBed.configureTestingModule({
            imports: [CharacterSelectionPageComponent],
            providers: [
                { provide: ActivatedRoute, useValue: mockRoute },
                { provide: CharacterService, useValue: mockCharacterService },
                { provide: WaitingRoomService, useValue: mockWaitingRoomService },
                { provide: Router, useValue: mockRouter },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterSelectionPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('selectTab', () => {
        it('should update the selectedTab property', () => {
            component.selectTab('bonus');
            expect(component.selectedTab).toBe('bonus');

            component.selectTab('profile');
            expect(component.selectedTab).toBe('profile');
        });
    });

    describe('updateAttributesUI', () => {
        it('should call updateAttribute and update isPlusVisible correctly', () => {
            component.updateAttributesUI(AttributeName.Health, -characterConstants.attributeIncrement);
            expect(component.characterService.updateAttributeBonus).toHaveBeenCalledWith(
                AttributeName.Health,
                -characterConstants.attributeIncrement,
            );
            expect(component.isPlusVisible).toBeTruthy();
        });
    });

    describe('handleContinueClick', () => {
        it('should show avatar error and select "profile" tab if avatar is not selected', async () => {
            mockCharacterService.selectedAvatar = '';
            await component.handleContinueClick();
            expect(component.showAvatarError).toBeTrue();
            expect(component.selectedTab).toBe('profile');
            expect(mockRouter.navigate).not.toHaveBeenCalled();
        });

        it('should show name error and select "profile" tab if name is empty', async () => {
            mockCharacterService.name = '';
            mockCharacterService.areAttributesBonusValid.and.returnValue(true);
            mockCharacterService.areAttributesDiceValid.and.returnValue(true);

            await component.handleContinueClick();

            expect(component.showNameError).toBeTrue();
            expect(component.selectedTab).toBe('profile');
            expect(mockRouter.navigate).not.toHaveBeenCalled();
        });

        it('should show attribute error and select "bonus" tab if attributes are invalid from "profile" tab', async () => {
            mockCharacterService.name = 'Guerrier';
            mockCharacterService.selectedAvatar = 'Guerrier';
            component.selectedTab = 'bonus';
            mockCharacterService.areAttributesBonusValid.and.returnValue(false);
            mockCharacterService.areAttributesDiceValid.and.returnValue(true);

            await component.handleContinueClick();

            expect(component.selectedTab).toBe('bonus');
            expect(mockRouter.navigate).not.toHaveBeenCalled();
            expect(component.showAttributeError).toBeTrue();
        });

        it('should show dice error and select "bonus" tab if dice are invalid from "bonus" tab', async () => {
            mockCharacterService.name = 'Guerrier';
            mockCharacterService.areAttributesBonusValid.and.returnValue(true);
            mockCharacterService.areAttributesDiceValid.and.returnValue(false);
            component.selectedTab = 'bonus';

            await component.handleContinueClick();

            expect(component.showDiceError).toBeTrue();
            expect(component.selectedTab).toBe('bonus');
            expect(mockRouter.navigate).not.toHaveBeenCalled();
        });

        it('should navigate to /waiting-room if all validations pass', async () => {
            mockCharacterService.name = 'Guerrier mec';
            mockCharacterService.selectedAvatar = 'testAvatar';

            mockCharacterService.areAttributesBonusValid.and.returnValue(true);
            mockCharacterService.areAttributesDiceValid.and.returnValue(true);

            await component.handleContinueClick();

            expect(mockCharacterService.joinWaitingRoom).toHaveBeenCalled();
        });
    });

    describe('handleBackClick', () => {
        it('should navigate to /create-game', () => {
            component.handleBackClick();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['create-game']);
        });
    });

    describe('ngOnDestroy', () => {
        it('should unsubscribe from observables', () => {
            spyOn(component['ngUnsubscribe'], 'next');
            spyOn(component['ngUnsubscribe'], 'complete');
            spyOn(component['ngUnsubscribe'], 'unsubscribe');

            component.ngOnDestroy();

            expect(component['ngUnsubscribe'].next).toHaveBeenCalled();
            expect(component['ngUnsubscribe'].complete).toHaveBeenCalled();
            expect(component['ngUnsubscribe'].unsubscribe).toHaveBeenCalled();
        });
    });

    it('should call joinWaitingRoom on handleRetry', () => {
        component.handleRetry();
        expect(mockCharacterService.joinWaitingRoom).toHaveBeenCalled();
    });
    describe('handleHomeButton', () => {
        it('should navigate to home', () => {
            component.handleHomeButton();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['home']);
        });
    });
    describe('Query Params handling', () => {
        it('should set mapId from query params', () => {
            queryParamsSubject.next({ id: '12345' });
            fixture.detectChanges();
            expect(mockCharacterService.resetCharacterRoom).toHaveBeenCalledWith('12345');
        });
    });
});
