import { Injectable, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Injectable()
export class LoggerService extends Logger {
    private readonly telegramService = new TelegramService();

    constructor(context: string = 'DefaultLogger') {
        super(context);
    }

    success(message: string) {
        super.log(message);
        this.telegramService.sendLogger(`${message}`, '🟢 SUCCESS');
    }

    info(message: string) {
        super.log(message);
        this.telegramService.sendLogger(`${message}`, '📫 INFO')    ;
    }

    log(message: string) {
        super.log(message);
    }
    
    async error(message: string, trace: string = "") {
        super.error(message, trace);
        await this.telegramService.sendLogger(`${message} - ${trace}`, '🔴 ERROR');
    }
    
    warn(message: string) {
        super.warn(message);
    }
}