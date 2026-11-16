import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TasksGateway } from './tasks.gateway';
import { Task } from './entities/task.entity';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { StatusesModule } from '../statuses/statuses.module';
import { EpicsModule } from '../epics/epics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    AuthModule,
    ProjectsModule,
    StatusesModule,
    EpicsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksGateway],
})
export class TasksModule {}
