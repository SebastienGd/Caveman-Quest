import { fail } from 'assert';
import { expect } from 'chai';
import { describe } from 'mocha';
import { Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DatabaseService } from './database.service';

describe('Database service', () => {
    let databaseService: DatabaseService;
    let mongoServer: MongoMemoryServer;
    const DB_NAME = 'database';
    beforeEach(async () => {
        databaseService = new DatabaseService();

        mongoServer = await MongoMemoryServer.create();
    });

    afterEach(async () => {
        if (databaseService['client']) {
            await databaseService['client'].close();
        }
    });

    it('should connect to the database when connectToDatabase is called', async () => {
        const mongoUri = mongoServer.getUri();
        await databaseService.connectToDatabase(mongoUri, DB_NAME);
        expect(databaseService['db'].databaseName).to.equal('database');
    });

    it('should not connect to the database when connectToDatabase is called with wrong URI', async () => {
        try {
            await databaseService.connectToDatabase('WRONG URL', 'RANDOM NAME');
            fail();
        } catch {
            return expect(databaseService['db']).be.null;
        }
    });
    it('should not connect to the database if already connected', async () => {
        const FAKE_DB = 'FAKEDB:)';
        databaseService['db'] = new Db(databaseService['client'], FAKE_DB);
        const mongoUri = mongoServer.getUri();
        await databaseService.connectToDatabase(mongoUri, DB_NAME);
        return expect(databaseService['db'].databaseName).to.equal(FAKE_DB);
    });

    it('should close Connection when closeConnection is called', async () => {
        const mongoUri = mongoServer.getUri();
        await databaseService.connectToDatabase(mongoUri, DB_NAME);

        await databaseService.closeConnection();
        return expect(databaseService['db']).be.null;
    });
});
