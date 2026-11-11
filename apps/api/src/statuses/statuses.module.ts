import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusesService } from './statuses.service';
import { StatusesController } from './statuses.controller';
import { StatusesGateway } from './statuses.gateway';
import { Status } from './entities/status.entity';
import { Task } from '../tasks/entities/task.entity';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Status, Task]),
    AuthModule,
    ProjectsModule,
  ],
  controllers: [StatusesController],
  providers: [StatusesService, StatusesGateway],
  exports: [StatusesService],
})
export class StatusesModule {}
