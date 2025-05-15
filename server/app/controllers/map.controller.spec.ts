import { Application } from '@app/app';
import { MapService } from '@app/services/map.service';
import { Map } from '@common/interfaces/map';
import { expect } from 'chai';
import * as fs from 'fs/promises';
import { StatusCodes } from 'http-status-codes';
import { beforeEach, describe, it } from 'mocha';
import * as path from 'path';
import { SinonStubbedInstance, createStubInstance } from 'sinon';
import * as supertest from 'supertest';
import { Container } from 'typedi';
describe('MapController', () => {
    let mapServiceMock: SinonStubbedInstance<MapService>;
    let expressApp: Express.Application;
    let validMap: Map;
    type ValidMethod = 'get' | 'post' | 'patch' | 'delete' | 'put';

    const applySupertest = async <T>(method: ValidMethod, url: string, code: StatusCodes, body: object, returnedBody?: T) => {
        return supertest(expressApp)
            [method](url)
            .send(body)
            .expect(code)
            .then((response) => {
                if (returnedBody) {
                    expect(response.body).to.deep.equal(returnedBody);
                }
            });
    };
    const applyInternalErrorTest = async (method: ValidMethod, url: string, title: string, content: string[], body: object) => {
        return applySupertest(method, url, StatusCodes.INTERNAL_SERVER_ERROR, body, {
            title,
            content,
        });
    };
    beforeEach(async () => {
        mapServiceMock = createStubInstance(MapService);

        const app = Container.get(Application);
        Object.defineProperty(app['mapController'], 'mapService', { value: mapServiceMock });
        expressApp = app.app;
        const serverRoot = process.cwd();

        const filePath = path.join(serverRoot, './tests/maps/valid0.small.ffa.json');
        const data = await fs.readFile(filePath, 'utf-8');
        validMap = JSON.parse(data);
    });

    describe('Get method', () => {
        it('should return maps from mapService on valid GET /api/maps', async () => {
            mapServiceMock.getAllMaps.returns(Promise.resolve([validMap]));
            return applySupertest('get', '/api/maps', StatusCodes.OK, {}, [validMap]);
        });
        it('should return specific map from mapService on valid GET /api/maps/:id', async () => {
            mapServiceMock.getMapById.withArgs(validMap._id).returns(Promise.resolve(validMap));
            return applySupertest('get', `/api/maps/${validMap._id}`, StatusCodes.OK, {}, validMap);
        });

        it('should return 404 (NOT_FOUND) from mapService on invalid id, GET /api/maps/:id', async () => {
            mapServiceMock.getMapById.withArgs(validMap._id).returns(Promise.resolve(validMap));
            const invalidId = 'INVALIDINVALIDINVALID';
            return applySupertest('get', `/api/maps/${invalidId}`, StatusCodes.NOT_FOUND, {});
        });

        it('should return errors if server fails to fetch all maps, GET /api/maps/', async () => {
            mapServiceMock.getAllMaps.throws();
            return applyInternalErrorTest('get', '/api/maps/', 'Error, couldnt fetch all maps', [''], {});
        });
        it('should return errors if server fails to fetch specific map, GET /api/maps/:id', async () => {
            mapServiceMock.getMapById.throws();
            return applyInternalErrorTest('get', `/api/maps/${validMap._id}`, 'Error, couldnt fetch map', [''], {});
        });
    });
    describe('Patch method', () => {
        const applyMapVisibilityTest = async (isVisible: boolean, storedMap: Map, requestMap: Map, ...supertestParams: unknown[]) => {
            mapServiceMock.updateMapVisibility.withArgs(storedMap._id, isVisible).callsFake(async (id, visible) => {
                if (id === storedMap._id) {
                    storedMap.visibility = visible;
                }
                return Promise.resolve(true);
            });
            return applySupertest(
                'patch',
                `/api/maps/visibility/${requestMap._id}`,
                supertestParams[0] as StatusCodes,
                supertestParams[1] as object,
                supertestParams[2],
            );
        };
        const validMapVisibilityParams = (isVisible: boolean) => [StatusCodes.NO_CONTENT, { visibility: isVisible }, {}];
        it('should make map from mapService visible on valid PATCH /api/maps/visibility/:id', async () => {
            const isVisible = true;
            return applyMapVisibilityTest(isVisible, validMap, validMap, ...validMapVisibilityParams(isVisible)).then(() =>
                expect(validMap.visibility).to.equal(isVisible),
            );
        });
        it('should make map from mapService NOT visible on valid PATCH /api/maps/visibility/:id', async () => {
            const isVisible = false;
            return applyMapVisibilityTest(isVisible, validMap, validMap, ...validMapVisibilityParams(isVisible)).then(() =>
                expect(validMap.visibility).to.equal(isVisible),
            );
        });

        it('should return 404 (NOT_FOUND) from mapService on invalid id, PATCH /api/maps/visibility/:id', async () => {
            const isVisible = true;
            const fakeMap = { _id: 'INVALID REQUEST ID', visibility: !isVisible };
            return applyMapVisibilityTest(isVisible, validMap, fakeMap as Map, StatusCodes.NOT_FOUND, { visibility: isVisible }).then(() =>
                expect(fakeMap.visibility).not.to.equal(isVisible),
            );
        });

        it('should return 400 (BAD_REQUEST) from mapService on invalid body,  PATCH /api/maps/visibility/:id', async () => {
            const isVisible = !validMap.visibility;
            return applyMapVisibilityTest(isVisible, validMap, validMap as Map, StatusCodes.BAD_REQUEST, {
                visibility: 'INVALID REQUEST BODY',
            }).then(() => expect(validMap.visibility).not.to.equal(isVisible));
        });

        it('should return errors if server fails to update map visibility, PATCH /api/maps/visibility/:id', async () => {
            mapServiceMock.updateMapVisibility.throws();
            return applyInternalErrorTest('patch', `/api/maps/visibility/${validMap._id}`, 'Error, couldnt update map visibility', [''], {
                visibility: true,
            });
        });
    });

    describe('Delete method', () => {
        it('should delete map from mapService on valid DELETE /api/maps/:id', async () => {
            mapServiceMock.deleteMap.withArgs(validMap._id).returns(Promise.resolve(true));
            return applySupertest('delete', `/api/maps/${validMap._id}`, StatusCodes.NO_CONTENT, {}, {});
        });
        it('should NOT delete map from mapService on invalid id, DELETE /api/maps/:id', async () => {
            const fakeId = 'MAP ID THAT DOESNT EXIST';
            mapServiceMock.deleteMap.withArgs(validMap._id).returns(Promise.resolve(true));
            return applySupertest('delete', `/api/maps/${fakeId}`, StatusCodes.NOT_FOUND, {});
        });
        it('should return errors if server fails to delete map, DELETE /api/maps/:id', async () => {
            mapServiceMock.deleteMap.throws();
            return applyInternalErrorTest('delete', `/api/maps/${validMap._id}`, 'Error, failed to delete map', [''], {});
        });
    });

    describe('Put method', () => {
        let newMap: Map;
        beforeEach(async () => {
            newMap = { ...validMap };
            mapServiceMock.checkConstraints.returns(Promise.resolve([]));
        });
        it('should create a map from mapService on valid PUT /api/maps/', async () => {
            const newID = 'NEW ID FROM CREATED MAP';

            mapServiceMock.updateOrCreateMap.callsFake(async (map) => {
                newMap._id = newID;
                return { map, wasCreated: true };
            });

            return applySupertest('put', '/api/maps/', StatusCodes.CREATED, newMap).then(() => expect(newMap._id).to.equal(newID));
        });
        it('should replace an existing map from mapService on valid PUT /api/maps/:id', async () => {
            const newName = 'UPDATED MAP NAME';
            newMap.name = newName;

            mapServiceMock.updateOrCreateMap.callsFake(async (map) => {
                validMap = map;
                return { map, wasCreated: false };
            });

            return applySupertest('put', '/api/maps/', StatusCodes.OK, newMap).then(() => expect(validMap.name).to.equal(newName));
        });
        it('should not replace or create map, if request map is invalid, PUT /api/maps/:id', async () => {
            const invalidMapWithNoName = {
                _id: '12345',
                description: 'This map is missing a name.',
                mode: 'Free-For-All',
                size: 10,
                tiles: [[{ tile: true }]],
                createdAt: 'test',
                updatedAt: 'test',
                visibility: true,
            };
            return applySupertest('put', '/api/maps/', StatusCodes.BAD_REQUEST, invalidMapWithNoName).then(
                () => expect(mapServiceMock.checkConstraints.called).to.be.false,
            );
        });

        it('should return errors if map validation fails, PUT /api/maps/', async () => {
            const error = 'door is misplaced';
            mapServiceMock.checkConstraints.callsFake(async () => {
                return [error];
            });

            return applySupertest('put', '/api/maps/', StatusCodes.BAD_REQUEST, newMap, {
                title: 'Error, map is not valid',
                content: [error],
            });
        });
    });
});
