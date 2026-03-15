import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import axios, { AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import * as https from 'https';
import { RouteExcludePayloadEnum } from '../shared/enums/route.enum';
import { appConfig } from '../../config/app.config';
import { DateUtil } from '@app/shared/utils/date.util';

@Injectable()
export class TelegramService {
    private botToken: string;
    private loggerBotToken: string;
    private readonly logger = new Logger(TelegramService.name);
    private readonly httpsAgent: https.Agent;

    constructor() {
        this.botToken = appConfig.TELEGRAM_BOT_TOKEN;
        this.loggerBotToken = appConfig.TELEGRAM_LOGGER_BOT_TOKEN;
        this.httpsAgent = new https.Agent({
            family: 4, // Force IPv4
            keepAlive: true,
            timeout: 30000,
        });
    }


    async callTelegramAPI(action: string, payload = {}, botToken = appConfig.TELEGRAM_BOT_TOKEN) {
        try {
            const url = `https://api.telegram.org/bot${botToken}/${action}`;
            const config: AxiosRequestConfig = {
                method: 'POST',
                url,
                data: payload,
                httpsAgent: this.httpsAgent,
            };
            return await axios(config);

        } catch (error) {
            this.handleTelegramError(error, payload['chatId'] ?? 'UND-chatId', action);
        }
    }

    async sendMessage(chatId: string | number, message: string, botToken = this.botToken) {
        return this.callTelegramAPI('sendMessage', { chat_id: chatId, text: message }, botToken);
    }

    async sendHtmlMessage(chatId: string | number, htmlMessage: string, botToken = this.botToken, message_thread_id?: number) {
        return this.callTelegramAPI('sendMessage', {
            chat_id: chatId,
            text: htmlMessage,
            parse_mode: 'HTML',
            ...(message_thread_id && { message_thread_id }),
        }, botToken);
    }

    async sendFile(chatId: string | number, filePath: string, filename: string, caption?: string, botToken = this.botToken) {
        const formData = new FormData();
        formData.append('chat_id', String(chatId));
        // formData.append('document', filePath, filename);
        formData.append('document', fs.createReadStream(filePath), { filename });
        if (caption) formData.append('caption', caption);

        return this.callTelegramAPI('sendDocument', formData, botToken);
    }

    async sendPdfToTelegram(chatId: string | number, pdfBuffer: Buffer, fileName = 'report.pdf', botToken = this.botToken) {
        const formData = new FormData();
        formData.append('chat_id', String(chatId));
        formData.append('document', pdfBuffer, {
            filename: fileName,
            contentType: 'application/pdf',
        });

        return this.callTelegramAPI('sendDocument', formData, botToken);
    }

    async sendMessageWithButton(chatId: string | number, message: string, buttons: { text: string; url?: string; callback_data?: string }[][], botToken = this.botToken) {
        return this.callTelegramAPI('sendMessage', {
            chat_id: chatId,
            text: message,
            reply_markup: { inline_keyboard: buttons },
        }, botToken);
    }

    async sendReplyButton(chatId: string | number, message: string, buttons: any[], botToken = this.botToken) {
        return this.callTelegramAPI('sendMessage', {
            chat_id: chatId,
            text: message,
            reply_markup: {
                keyboard: [buttons],
                one_time_keyboard: true,
                resize_keyboard: true,
            },
        }, botToken);
    }

    async sendRemoveButton(chatId: string | number, message: string, botToken = this.botToken) {
        return this.callTelegramAPI('sendMessage', {
            chat_id: chatId,
            text: message,
            reply_markup: { remove_keyboard: true },
        }, botToken);
    }

    async sendChatAction(chatId: string | number, action: TelegramBot.ChatAction, botToken = this.botToken) {
        return this.callTelegramAPI('sendChatAction', {
            chat_id: chatId,
            action,
        }, botToken);
    }

    async setCommand(chatId: string | number, commands: { command: string, description: string }[], botToken = this.botToken) {
        return this.callTelegramAPI('setMyCommands', {
            commands,
            scope: {
                type: 'chat',
                chat_id: chatId,
            },
        }, botToken);
    }

    async answerCallbackQuery(callbackQueryId: string, botToken = this.botToken) {
        return this.callTelegramAPI('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
        }, botToken);
    }

    async setLaunchButton(chatId: string | number, text: string, url: string) {
        const payload = {
            chat_id: Number(chatId),
            menu_button: {
                type: "web_app",
                text: text,
                web_app: { url }
            }
        };

        return await this.callTelegramAPI('setChatMenuButton', payload);
    }

    async setMenuButton(chatId: string | number) {
        const payload = {
            chat_id: Number(chatId),
            menu_button: {
                type: "default",
            }
        };

        return await this.callTelegramAPI('setChatMenuButton', payload);
    }

    /**
     * SEND LOG TO TELEGRAM
     */
    async sendErrorLog(param: { 
        message             ?: string
        , user_id           ?: number
        , user_name         ?: string
        , method            ?: string
        , statusCode        ?: number
        , endPoint          ?: string
        , ip                ?: string
        , agent             ?: string
        , payload           ?: any
        , response          ?: any
        , headers           ?: any
        , stackTrace        ?: string
    }) {

        const excludeSuffixes = Object.values(RouteExcludePayloadEnum);
        const endpoint = param.endPoint ?? '';
        const shouldExcludePayload = excludeSuffixes.some(suffix =>
            endpoint.endsWith(suffix)
        );
        const payload = shouldExcludePayload ? "[PROTECTED: SENSITIVE ROUTE]" : param.payload;
        

        const template = `
<code>• SYSTEM: ${appConfig.SYSTEM}
• ENV   : ${appConfig.ENV}
• DATE  : ${ DateUtil.formatDate(DateUtil.toCambodiaTime(new Date()))}
• USER  : ${param.user_name}
• IP    : ${param.ip}
• AGENT : ${param.agent}
• METHOD: ${param.method} | ${param.statusCode ?? ''}
• PATH  : ${param.endPoint}

• MSG   : ${param.message}

• BODY  : ${JSON.stringify(payload, null, 2) ?? ''}</code>`;
        
        await this.sendHtmlMessage(appConfig.TELEGRAM_LOGGER_CHAT_ID, template, this.loggerBotToken, Number(appConfig.TELEGRAM_LOGGER_MESSAGE_THREAD_ID));
    }

    /**
     * SEND LOG TO TELEGRAM
     */
    async sendStackTrace(stackTrace) {
        function escapeHtml(str: string) {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            }
        const template = `
<pre>
${escapeHtml(stackTrace)}
</pre>
        `

        await this.sendHtmlMessage(appConfig.TELEGRAM_LOGGER_CHAT_ID, template, this.loggerBotToken);
    }

    /**
     * Handle Telegram API errors
     */
    private handleTelegramError(error: any, chatId: string | number, methodName: string) {
        if (error.response && error.response.body) {
            const { error_code, description } = error.response.body;
            this.logger.error(`🔥 ${methodName} - chat_id: ${chatId} - ${error_code} - ${description}`);
        
        } else if (error instanceof AggregateError) {
            this.logger.error(`🔥 ${methodName} - chat_id: ${chatId} - AggregateError:`, {
                errorCount: error.errors.length,
                errors: error.errors.map(e => e.message || String(e))
            });

        } else {
            this.logger.error(`🔥 ${methodName} - chat_id: ${chatId} - ${error.message || error}`, {
                stack: error.stack
            });
        }
    }

    /**
     * SEND LOG TO TELEGRAM
     */
    async sendLogger(message = "unknown" , status = "unknown") {
        const template = `
<code>
• 📝 STATUS     : ${status} 
• ⚙️ SYSTEM     : ${appConfig.SYSTEM} 
• 🌐 ENV        : ${appConfig.ENV} 
• ⌛ DATETIME   : ${ DateUtil.formatDate(DateUtil.toCambodiaTime(new Date))} 
• 💬 MESSAGE    : ${message}
</code>
    `

        await this.sendHtmlMessage(appConfig.TELEGRAM_LOGGER_CHAT_ID, template, this.loggerBotToken, Number(appConfig.TELEGRAM_LOGGER_MESSAGE_THREAD_ID));
    }
}
