import { ResponseMessage } from '@app/interfaces/http-response-message';
import { MapService } from '@app/services/map.service';
import { isMap } from '@app/utils/game-checks';
import { ApiRoute } from '@common/constants/api-routes';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class MapController {
    router: Router;

    constructor(private readonly mapService: MapService) {
        this.configureRouter();
    }

    private configureRouter(): void {
        this.router = Router();

        this.constructRoute(this.router, '/', 'get', 'Error, couldnt fetch all maps', async () => {
            const maps = await this.mapService.getAllMaps();
            return { statusCode: StatusCodes.OK, json: maps };
        });

        this.constructRoute(this.router, ApiRoute.MapById, 'get', 'Error, couldnt fetch map', async (req) => {
            const map = await this.mapService.getMapById(req.params.id);
            if (!map) {
                return {
                    statusCode: StatusCodes.NOT_FOUND,
                    message: { title: 'Error, map not found', content: [`Map with ID ${req.params.id} does not exist.`] },
                };
            } else {
                return { statusCode: StatusCodes.OK, json: map };
            }
        });

        this.constructRoute(this.router, ApiRoute.MapVisibility + ApiRoute.MapById, 'patch', 'Error, couldnt update map visibility', async (req) => {
            const { visibility } = req.body;
            if (typeof visibility === 'boolean') {
                const mapHasUpdated = await this.mapService.updateMapVisibility(req.params.id, visibility);
                if (!mapHasUpdated) {
                    return {
                        statusCode: StatusCodes.NOT_FOUND,
                        message: { title: 'Error, map not found', content: [`Map with ID ${req.params.id} does not exist.`] },
                    };
                }
                return { statusCode: StatusCodes.NO_CONTENT };
            }
            return { statusCode: StatusCodes.BAD_REQUEST, content: 'Error, invalid visibility parameter' };
        });

        this.constructRoute(this.router, ApiRoute.MapById, 'delete', 'Error, failed to delete map', async (req) => {
            const deleted = await this.mapService.deleteMap(req.params.id);
            if (!deleted) {
                return {
                    statusCode: StatusCodes.NOT_FOUND,
                    message: { title: 'Error, map not found', content: [`Map with ID ${req.params.id} does not exist.`] },
                };
            }
            return { statusCode: StatusCodes.NO_CONTENT };
        });

        this.constructRoute(this.router, '/', 'put', 'Error, couldnt create or update map', async (req) => {
            if (isMap(req.body)) {
                const errors = await this.mapService.checkConstraints(req.body);
                if (errors.length > 0) {
                    return {
                        statusCode: StatusCodes.BAD_REQUEST,
                        message: { title: 'Error, map is not valid', content: errors },
                    };
                }
                const databaseInfo = await this.mapService.updateOrCreateMap(req.body);

                return { statusCode: databaseInfo.wasCreated ? StatusCodes.CREATED : StatusCodes.OK };
            } else {
                return { statusCode: StatusCodes.BAD_REQUEST, content: ['Error, invalid Map interface'] };
            }
        });
    }

    private constructRoute(
        router: Router,
        path: string,
        method: 'get' | 'post' | 'put' | 'patch' | 'delete',
        defaultError: string,
        methodHandler: (req: Request) => Promise<ResponseMessage>,
    ) {
        router[method](path, async (req, res) => {
            try {
                this.sendMessage(res, await methodHandler(req));
            } catch (error) {
                this.sendMessage(res, { statusCode: StatusCodes.INTERNAL_SERVER_ERROR, message: { title: defaultError, content: [''] } });
            }
        });
    }

    private sendMessage(res: Response, responseMessage: ResponseMessage): void {
        res.status(responseMessage.statusCode);

        if (responseMessage.message) {
            res.json(responseMessage.message);
        } else if (responseMessage.json) {
            res.json(responseMessage.json);
        } else res.send();
    }
}
