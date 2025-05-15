import { Application } from '@app/app';
import { DatabaseService } from '@app/services/database.service';
import * as dotenv from 'dotenv';
import * as http from 'http';
import { AddressInfo } from 'net';
import { Service } from 'typedi';
import { SocketManager } from './services/socket-manager.service';

dotenv.config();

@Service()
export class Server {
    private static readonly appPort: string | number | boolean = Server.normalizePort(process.env.PORT || '3000');
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    private static readonly baseDix: number = 10;
    private server: http.Server;

    constructor(
        private readonly application: Application,
        private mongoDbService: DatabaseService,
        private socketManager: SocketManager,
    ) {}

    private static normalizePort(val: number | string): number | string | boolean {
        const port: number = typeof val === 'string' ? parseInt(val, this.baseDix) : val;
        return isNaN(port) ? val : port >= 0 ? port : false;
    }

    async init(): Promise<void> {
        this.application.app.set('port', Server.appPort);

        this.server = http.createServer(this.application.app);
        this.socketManager.setServer(this.server);
        this.server.listen(Server.appPort);
        this.server.on('error', (error: NodeJS.ErrnoException) => this.onError(error));
        this.server.on('listening', () => this.onListening());
        await this.connectToDatabase();
    }

    private onError(error: NodeJS.ErrnoException): void {
        if (error.syscall !== 'listen') {
            throw error;
        }
        const bind: string = typeof Server.appPort === 'string' ? 'Pipe ' + Server.appPort : 'Port ' + Server.appPort;
        switch (error.code) {
            case 'EACCES':
                // eslint-disable-next-line no-console
                console.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                // eslint-disable-next-line no-console
                console.error(`${bind} is already in use`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

    private onListening(): void {
        const addr = this.server.address() as AddressInfo;
        const bind: string = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
        // eslint-disable-next-line no-console
        console.log(`Listening on ${bind}`);
    }
    private async connectToDatabase(): Promise<void> {
        this.mongoDbService
            .connectToDatabase(process.env.DB_URI, process.env.DB_NAME)
            .then(() => {
                // eslint-disable-next-line no-console
                console.log('MongoDB connection successful!');
            })
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.log(`Failed to connect to MongoDB: ${err}`);
                process.exit(1);
            });
    }
}
