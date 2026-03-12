import { MESSAGE } from "src/app/enums/message.enum";
import { HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { ITranslate } from "./data.interface";
import { TelegramService } from "src/app/services/telegram.service";

export interface BaseResponse<T = any> {
    status_code  : number;
    success      : number;
    message      : any;
    data?        : T;
}

export interface ErrorBaseResponse<T = any> {
    status_code  : number;
    success      : number;
    message      : any;
    data?        : T;
    error?       : any;
    path         : string;
    timestamp    : string;
}

export interface ListResponse<T = any> {
    limit   : number,
    offset  : number,
    total   : number,
    meta    ?: any | undefined,
    results : T[]
}

export interface StreamResponse<T = any> {
    stream_end  : number,
    progress    : number,
    results     : T
}

// USAGE : return ResponseUtil.success(res, data);
// USAGE : return ResponseUtil.error(res, ERROR_MESSAGE.USER_NOT_FOUND)
export class ResponseUtil {
    static success<T>(res: Response, data: T, message = MESSAGE.SUCCESS, status_code = 200): Response {
        return res.status(status_code).json({
            status_code: status_code,
            success: 1,
            message,
            data
        })
    }
  
    static error(res: Response, message: ITranslate, status_code = HttpStatus.BAD_REQUEST, error?: any): Response {
        // SEND LOG TO TELEGRAM
        const telegramService = new TelegramService();
        telegramService.sendErrorLog({
            message         : `${JSON.stringify(message)} - ${JSON.stringify(error)}`
            , method        : res.req.method
            , statusCode    : status_code
            , endPoint      : res.req.url
            , ip            : res.req.ip
            , agent         : res.req.headers['user-agent'] || ''
            , payload       : res.req.body
            , headers       : res.req.headers
            , response      : { message, error }
        })

        // Check if error parameter has the expected data structure for consistency
        if (error && typeof error === 'object' && 'success' in error && 'errors' in error && 'created_users' in error) {
            return res.status(status_code).json({
                status_code,
                success: 0,
                message,
                data: error
            })
        }

        return res.status(status_code).json({
            status_code,
            success: 0,
            message,
            error: error || 'Error',
            timestamp: new Date().toISOString(),
        })
    }

    static stream(res: Response, param: {status_code?: number, success?: number, message?: string, data?: StreamResponse}) {
        const responseData = {
            status_code  : param.status_code || 200,
            success      : param.success || 1,
            message      : param.message || null,
            data         : param.data || {},
        } as BaseResponse

        res.write(`data: ${JSON.stringify(responseData)}\n\n`);
    }

    static streamResponse(res: Response, progress = 0, results: any = null, stream_end = 0) {
        const data = {
            stream_end  : stream_end,
            progress    : progress,
            results     : results
        } as StreamResponse

        ResponseUtil.stream(res, { data })
    }
}
  