import { TestBed } from '@angular/core/testing';
import { AVATARS } from '@common/constants/avatars';
import { CharacterEvent } from '@common/constants/character-events';
import { RoomEvent } from '@common/constants/room-events';
import { Room } from '@common/constants/rooms';
import { AttributeName, Dice } from '@common/interfaces/player';
import characterConstants from 'src/utils/constants/character-constants';
import { CharacterService } from './character.service';
import { SocketClientService } from './socket-client.service';

describe('CharacterService', () => {
    let service: CharacterService;
    let mockSocketService: jasmine.SpyObj<SocketClientService>;

    beforeEach(() => {
        mockSocketService = jasmine.createSpyObj('SocketClientService', ['send'], {
            socket: jasmine.createSpyObj('socket', ['emit']),
        });

        TestBed.configureTestingModule({
            providers: [CharacterService, { provide: SocketClientService, useValue: mockSocketService }],
        });

        service = TestBed.inject(CharacterService);
        service.attributes = {
            currentHealth: characterConstants.defaultValue,
            health: characterConstants.defaultValue,
            speed: characterConstants.defaultValue,
            attack: { value: characterConstants.defaultValue, dice: Dice.Dice4 },
            defense: { value: characterConstants.defaultValue, dice: Dice.Dice6 },
        };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('characters array', () => {
        it('should initialize with 12 characters', () => {
            expect(AVATARS.length).toBe(characterConstants.nCharacters);
        });
    });

    describe('selectedCharacter', () => {
        it('should initialize to an empty string', () => {
            expect(service.selectedAvatar).toEqual('');
        });
    });

    describe('selectAvatar', () => {
        it('should emit SelectAvatar event and update selectedAvatar', () => {
            const avatar = 'avatar1';

            mockSocketService.socket.emit = jasmine.createSpy('emit').and.callFake((event: string, data: unknown, cb?: () => void) => {
                if (event === CharacterEvent.SelectAvatar && cb) cb();
            });

            service.selectAvatar(avatar);

            expect(mockSocketService.socket.emit).toHaveBeenCalledWith(CharacterEvent.SelectAvatar, avatar, jasmine.any(Function));
            expect(service.selectedAvatar).toBe(avatar);
        });
    });

    describe('updateAttributeBonus', () => {
        it('should increase the attribute value within the allowed range', () => {
            const attribute = service.attributes.health;
            service.updateAttributeBonus(AttributeName.Health, characterConstants.attributeIncrement);
            expect(attribute).toBeLessThanOrEqual(characterConstants.maxValue);
        });

        it('should decrease the attribute value within the allowed range', () => {
            const attribute = service.attributes.health;
            service.updateAttributeBonus(AttributeName.Health, -characterConstants.attributeIncrement);
            expect(attribute).toBeGreaterThanOrEqual(characterConstants.defaultValue);
        });

        it('should not increase the attribute value above the maxValue', () => {
            service.attributes.health = characterConstants.maxValue - characterConstants.attributeIncrement;
            service.updateAttributeBonus(AttributeName.Health, characterConstants.attributeIncrement);
            expect(service.attributes.health).toBe(characterConstants.maxValue);
        });

        it('should not decrease the attribute value below the defaultValue', () => {
            const attribute = service.attributes.health;
            service.updateAttributeBonus(AttributeName.Health, -characterConstants.attributeIncrement);
            expect(attribute).toBe(characterConstants.defaultValue);
        });
    });

    describe('validateAttributes', () => {
        it('should return true if at least one attribute has a value different from defaultValue', () => {
            service.attributes.health = characterConstants.maxValue;
            const result = service.areAttributesBonusValid();
            expect(result).toBeTrue();
        });

        it('should return false if all attributes have defaultValue', () => {
            service.attributes.health = characterConstants.defaultValue;
            const result = service.areAttributesBonusValid();
            expect(result).toBeFalse();
        });

        it('should return true for diceValid if all attributes have a valid dice', () => {
            service.attributes.attack.dice = Dice.Dice4;
            service.attributes.defense.dice = Dice.Dice6;
            const result = service.areAttributesDiceValid();
            expect(result).toBeTrue();
        });

        it('should return false for diceValid if at least one attribute has an invalid dice', () => {
            service.attributes.attack.dice = null;
            service.attributes.defense.dice = Dice.Dice6;
            const result = service.areAttributesDiceValid();
            expect(result).toBeFalse();
        });
    });

    describe('onDragStart', () => {
        it('should set draggedDice to the provided dice type', () => {
            const diceType = Dice.Dice4;
            service.onDragStart(diceType);
            expect(service['draggedDice']).toBe(diceType);
        });
    });

    describe('onDragOver', () => {
        it('should call event.preventDefault()', () => {
            const event = new DragEvent('dragover');
            spyOn(event, 'preventDefault');
            service.onDragOver(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });

    describe('onDrop', () => {
        it('should assign the dragged dice to the selected attribute', () => {
            service['draggedDice'] = Dice.Dice4;
            service.onDrop(AttributeName.Attack);
            expect(service.attributes.attack.dice).toBe(service['draggedDice']);
        });

        it('should assign the opposite dice type to other attributes  if draggedDice is dice4', () => {
            service['draggedDice'] = Dice.Dice4;
            service.onDrop(AttributeName.Attack);
            expect(service.attributes.attack.dice).toBe(Dice.Dice4);
            expect(service.attributes.defense.dice).toBe(Dice.Dice6);
        });

        it('should assign the opposite dice type to other attributes if draggedDice is dice4', () => {
            service['draggedDice'] = Dice.Dice6;
            service.onDrop(AttributeName.Defense);
            expect(service.attributes.defense.dice).toBe(Dice.Dice6);
            expect(service.attributes.attack.dice).toBe(Dice.Dice4);
        });
    });

    describe('joinWaitingRoom', () => {
        it('should emit joinWaitingRoom with the correct player data and mapId', () => {
            service['mapId'] = 'map123';
            service.joinWaitingRoom();
            expect(mockSocketService.socket.emit).toHaveBeenCalledWith(
                'joinWaitingRoom',
                jasmine.objectContaining({
                    name: service.name,
                    avatar: service.selectedAvatar,
                    attributes: service.attributes,
                }),
                service['mapId'],
            );
        });
    });
    describe('quit', () => {
        it('should send "characterSelectionQuit" through the socket service', () => {
            service.quit();
            expect(mockSocketService.send).toHaveBeenCalledWith(RoomEvent.Quit);
        });
    });

    describe('resetCharacterRoom', () => {
        it('should update mapId and call VerifyRoom event if mapId is null', () => {
            service.resetCharacterRoom(null);
            expect(service['mapId']).toBeNull();
            expect(mockSocketService.send).toHaveBeenCalledWith(RoomEvent.VerifyRoom, Room.Character);
        });

        it('should update mapId and not call VerifyRoom if mapId is provided', () => {
            const mapId = 'map123';
            service.resetCharacterRoom(mapId);

            expect(service['mapId']).toBe(mapId);
            expect(mockSocketService.send).not.toHaveBeenCalledWith(RoomEvent.VerifyRoom, Room.Character);
        });
    });
});
