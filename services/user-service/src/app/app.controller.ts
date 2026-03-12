import { Controller, Get, HttpException, HttpStatus, Render } from '@nestjs/common';

@Controller()
export class AppController {
    constructor() {}

    @Get()
    async root() {
        return "";
    }
}
