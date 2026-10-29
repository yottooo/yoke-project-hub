import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  providers: [ChatGateway],
  imports: [ProjectsModule],
})
export class ChatModule {}
