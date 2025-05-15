import { DatabaseService } from '@app/services/database.service';
import { toPositionedTiles } from '@app/utils/algorithms';
import { Map } from '@common/interfaces/map';
import { Collection, ObjectId } from 'mongodb';
import { Service } from 'typedi';
import { MapValidatorService } from './map-validator.service';
@Service()
export class MapService {
    constructor(
        private readonly dbService: DatabaseService,
        private readonly validatorService: MapValidatorService,
    ) {}

    async getAllMaps(): Promise<Map[]> {
        return this.getMapsCollection().find({}).toArray();
    }

    async getMapById(id: string): Promise<Map | null> {
        return this.getMapsCollection().findOne({ _id: id });
    }

    async updateOrCreateMap(map: Map): Promise<{ map: Map; wasCreated: boolean }> {
        if (!map._id) {
            map._id = new ObjectId().toString();
        }
        map.updatedAt = new Date().toISOString();
        map.visibility = false;
        const result = await this.getMapsCollection().updateOne({ _id: map._id }, { $set: map }, { upsert: true });
        const wasCreated = result.upsertedCount > 0;

        if (wasCreated) {
            map.createdAt = new Date().toISOString();
            await this.getMapsCollection().updateOne({ _id: map._id }, { $set: { createdAt: map.createdAt } });
        }

        return { map, wasCreated };
    }

    async updateMapVisibility(id: string, visibility: boolean): Promise<boolean> {
        return (await this.getMapsCollection().updateOne({ _id: id }, { $set: { visibility } })).matchedCount > 0;
    }

    async deleteMap(id: string): Promise<boolean> {
        return (await this.getMapsCollection().deleteOne({ _id: id })).deletedCount > 0;
    }

    async checkConstraints(map: Map): Promise<string[]> {
        const errors: string[] = [];
        const tiles = toPositionedTiles(map.tiles);
        await this.checkUniqueName(map, errors);
        this.validatorService.checkDescription(map, errors);
        this.validatorService.checkTerrainCoverage(map, errors);
        this.validatorService.checkObjectConstraints(map, errors);
        this.validatorService.checkDoorPlacement(tiles, errors);
        this.validatorService.checkTileAccessibility(tiles, errors);
        return errors;
    }

    private async checkUniqueName(map: Map, errors: string[]): Promise<void> {
        const existingMap = await this.getMapsCollection().findOne({ name: map.name, _id: { $ne: map._id } });
        if (existingMap) {
            errors.push(`Erreur: Le nom '${map.name}' est déjà utilisé.`);
        }
        if (!map.name) {
            errors.push('Erreur: La carte doit avoir un nom.');
        }
    }

    private getMapsCollection(): Collection<Map> {
        return this.dbService.db.collection<Map>(process.env.DB_MAPS_COLLECTION);
    }
}
