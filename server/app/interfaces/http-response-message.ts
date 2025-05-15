import { Message } from '@common/interfaces/message';
import { StatusCodes } from 'http-status-codes';

export interface ResponseMessage {
    statusCode: StatusCodes;
    message?: Message;
    json?: object;
}
