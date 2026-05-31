import { Module } from '@nestjs/common';
import { StemverseAuthModule } from '@stemverse/auth';

@Module({
  imports: [StemverseAuthModule.register()],
  exports: [StemverseAuthModule],
})
export class AiAuthModule {}
