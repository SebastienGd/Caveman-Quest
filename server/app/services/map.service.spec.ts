import { DatabaseService } from '@app/services/database.service';
import { MapService } from '@app/services/map.service';
import { Map } from '@common/interfaces/map';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as path from 'path';
import { SinonStubbedInstance, assert, createStubInstance } from 'sinon';
import { MapValidatorService } from './map-validator.service';
dotenv.config();
const serverRoot = process.cwd();

const validMap = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/validMap.json'), 'utf8'));
const invalidMap = JSON.parse(readFileSync(path.join(serverRoot, './tests/maps/invalidMap.json'), 'utf8'));

let databaseService: DatabaseService;
let mapValidatorService: SinonStubbedInstance<MapValidatorService>;

let mapService: MapService;
let mongoServer: MongoMemoryServer;
const COLLECTION_NAME = process.env.DB_MAPS_COLLECTION;

describe('MapService', () => {
    beforeEach(async () => {
        databaseService = new DatabaseService();
        mapValidatorService = createStubInstance(MapValidatorService);
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await databaseService.connectToDatabase(mongoUri, 'testDB');
        await databaseService.db.createCollection(COLLECTION_NAME);
        mapService = new MapService(databaseService, mapValidatorService);
    });

    afterEach(async () => {
        await databaseService.closeConnection();
        await mongoServer.stop();
    });

    describe('getAllMaps', () => {
        it('should return an empty array when there are no maps', async () => {
            const maps = await mapService.getAllMaps();
            return expect(maps).to.be.an('array').that.is.empty;
        });

        it('should return all maps in the collection', async () => {
            const map = { ...validMap };
            const result = await databaseService.db.collection(COLLECTION_NAME).insertOne(map);
            const maps = await mapService.getAllMaps();
            expect(maps).to.have.lengthOf(1);
            expect(maps[0]._id.toString()).to.equal(result.insertedId.toString());
        });
    });

    describe('getMapById', () => {
        it('should return null for a non-existent map ID', async () => {
            const map = await mapService.getMapById('nonexistent-id');
            return expect(map).to.be.null;
        });

        it('should return the correct map for a valid ID', async () => {
            const map = { ...validMap };
            await databaseService.db.collection(COLLECTION_NAME).insertOne(map);

            const fetchedMap = await mapService.getMapById(map._id);
            expect(fetchedMap).to.deep.equal(map);
        });
    });

    describe('createMap', () => {
        it('should create a new map successfully', async () => {
            validMap._id = null;
            validMap.visibility = true;
            const result = await mapService.updateOrCreateMap(validMap);
            const mapInDb = await mapService.getMapById(result.map._id);
            return expect(result).to.not.be.null, expect(mapInDb).to.not.be.null.and.to.be.equal(validMap), expect(mapInDb.visibility).to.be.false;
        });
    });

    describe('replaceMap', () => {
        it('should replace an existing map successfully', async () => {
            const map = { ...validMap };
            const inserted = await databaseService.db.collection(COLLECTION_NAME).insertOne(map);
            const initialId = inserted.insertedId.toString();
            map._id = initialId;

            map.description = 'Updated description';
            const { wasCreated: result } = await mapService.updateOrCreateMap(map);
            const updatedMap = await mapService.getMapById(initialId);
            return expect(result).to.be.false, expect(updatedMap.description).to.equal('Updated description');
        });
    });

    describe('updateMapVisibility', () => {
        it('should update the visibility of an existing map', async () => {
            const map = { ...validMap };
            const inserted = await databaseService.db.collection(COLLECTION_NAME).insertOne(map);
            const mapId = inserted.insertedId.toString();

            const result = await mapService.updateMapVisibility(mapId, false);

            const updatedMap = await databaseService.db.collection(COLLECTION_NAME).findOne({ _id: inserted.insertedId });
            return expect(result).to.be.true, expect(updatedMap.visibility).to.equal(false);
        });

        it('should return false when updating the visibility of a non-existent map', async () => {
            const result = await mapService.updateMapVisibility('nonexistent-id', true);
            return expect(result).to.be.false;
        });
    });

    describe('checkConstraints', () => {
        it('should return an empty array for a valid map', async () => {
            const errors = await mapService.checkConstraints(validMap as Map);
            return expect(errors).to.be.an('array').that.is.empty;
        });
        it('should call validation methods in checkConstraints', async () => {
            await databaseService.db.collection(COLLECTION_NAME).insertOne(validMap);
            const errors = await mapService.checkConstraints(invalidMap as Map);

            assert.calledOnce(mapValidatorService.checkDescription);
            assert.calledOnce(mapValidatorService.checkTerrainCoverage);
            assert.calledOnce(mapValidatorService.checkObjectConstraints);
            assert.calledOnce(mapValidatorService.checkDoorPlacement);
            assert.calledOnce(mapValidatorService.checkTileAccessibility);
            return expect(errors).to.be.an('array').that.includes.members(["Erreur: Le nom 'TEST' est déjà utilisé."]);
        });

        it('should return an error if no name is provided', async () => {
            validMap.name = '';
            const errors = await mapService.checkConstraints(validMap as Map);
            return expect(errors).to.be.an('array').that.includes.members(['Erreur: La carte doit avoir un nom.']);
        });
    });

    describe('deleteMap', () => {
        it('should delete an existing map successfully', async () => {
            const map = { ...validMap };
            await databaseService.db.collection(COLLECTION_NAME).insertOne(map);

            const result = await mapService.deleteMap(map._id);
            const deletedMap = await mapService.getMapById(map._id);
            return expect(result).to.be.true, expect(deletedMap).to.be.null;
        });
        it('should return false when deleting a non-existent map', async () => {
            const result = await mapService.deleteMap('nonexistent-id');
            return expect(result).to.be.false;
        });
    });
});
