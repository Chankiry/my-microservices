import { Module, Global } from '@nestjs/common';
import { SharedDataService } from './shared-data.service';

@Global()
@Module({
    providers: [SharedDataService],
    exports: [SharedDataService],
})
export class SharedDataModule {}
