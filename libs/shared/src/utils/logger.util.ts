import { Logger } from '@nestjs/common';

export class MicroserviceLogger {
    private static logger = new Logger('Microservice');

    static log(message: string, context?: string) {
        this.logger.log(message, context);
    }

    static error(message: string, trace?: string, context?: string) {
        this.logger.error(message, trace, context);
    }

    static warn(message: string, context?: string) {
        this.logger.warn(message, context);
    }

    static debug(message: string, context?: string) {
        this.logger.debug(message, context);
    }

    static verbose(message: string, context?: string) {
        this.logger.verbose(message, context);
    }
}

export const createLogger = (context: string) => {
    return new Logger(context);
};
