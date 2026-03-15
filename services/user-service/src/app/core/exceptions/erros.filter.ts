import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { TelegramService } from '../../services/telegram.service';
import { BaseTranslate } from '../../enums/translate.enum';
import { ERROR_MESSAGE } from '../../enums/message.enum';
import { ErrorBaseResponse } from '../../interface/base.interface';
import { DateUtil } from '../../utils/date.util';

@Catch()
export class ExceptionErrorsFilter implements ExceptionFilter {
    private readonly logger = new Logger(ExceptionErrorsFilter.name);
    private readonly telegramService = new TelegramService();

    async catch(exception: any, host: ArgumentsHost) {
        const startTime = Date.now();
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception instanceof HttpException ? exception?.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        const duration = Date.now() - startTime;
        const stack_err = exception.stack;
        const ip = request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress || 'Unknown IP';
        const userAgent = request.headers['user-agent'] || 'Unknown User-Agent';
        const payload = request.body;

        // LOGGER ERROR TO TERMINAL
        this.logger.error(
            `🔥 ${request.method} ${request.url} - status: ${status} - ${exception.name} - ${duration}ms - ${exception.message || 'Unknown error'}`
            , ''
            , `🔴 STACK DETIAL: ${stack_err}`
        );

        function translateMessage(message: any) {
            return message ? new BaseTranslate(message) : null;
        }
        
        // HANDLE EXCEPTION MESSAGE
        let exceptionMessage: any;
        let error: any;
        let message: any;

        if (exception instanceof HttpException) {
            exceptionMessage = exception.getResponse();
            message = typeof exceptionMessage !== 'string' ? translateMessage(exceptionMessage.error) || translateMessage(exception.name) : ERROR_MESSAGE.SOMETHING_WRONG;
            error = typeof exceptionMessage === 'string' ? exceptionMessage : exceptionMessage.message;

        } else {
            // HANDLE NON-HTTPEXCEPTION (E.G., TYPEERROR, ERROR)
            message = ERROR_MESSAGE.SOMETHING_WRONG;
            error = exception.message || 'Unknown error';
        }
        
        // ERROR VALIDATION
        if (Array.isArray(error)) {
            const mapErrors: { type: string; message: any; }[] = error.map(value => ({
                type: 'payload_field',
                message: value
            }));
            error = mapErrors;
            message = ERROR_MESSAGE.VALIDATION_FAIL;
        }

        const responseBody: ErrorBaseResponse = {
            status_code : status,
            success     : 0,
            message     : message,
            error       : error,
            timestamp   : DateUtil.formatBasicDate(new Date()),
            path        : request.url,
        };

        // SEND LOG TO TELEGRAM
        await this.telegramService.sendErrorLog({
            message         : `${exception.name} - ${exception.message} - ${JSON.stringify(error)}`
            , method        : request.method
            , statusCode    : status
            , endPoint      : request.url
            , ip            : JSON.stringify(ip)
            , agent         : userAgent
            , payload       : payload
            , headers       : request.headers
            , response      : responseBody
            , stackTrace    : stack_err
        })
        
        response.status(status).json(responseBody);
    }
}
