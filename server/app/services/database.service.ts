import { Db, MongoClient, ServerApiVersion } from 'mongodb';
import { Service } from 'typedi';

@Service()
export class DatabaseService {
    db: Db | null = null;
    private client: MongoClient | null = null;

    async connectToDatabase(uri: string, dbName: string): Promise<void> {
        if (!this.db) {
            this.client = new MongoClient(uri, {
                serverApi: {
                    version: ServerApiVersion.v1,
                    strict: true,
                    deprecationErrors: true,
                },
            });

            await this.client.connect();
            this.db = this.client.db(dbName);
        }
    }

    async closeConnection(): Promise<void> {
        await this.client.close();
        this.db = null;
    }
}
