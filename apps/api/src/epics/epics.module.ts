import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpicsService } from './epics.service';
import { EpicsController } from './epics.controller';
import { EpicsGateway } from './epics.gateway';
import { Epic } from './entities/epic.entity';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';

// TasksModule imports this one (to check a task's epic), never the other way round.
@Module({
  imports: [TypeOrmModule.forFeature([Epic]), AuthModule, ProjectsModule],
  controllers: [EpicsController],
  providers: [EpicsService, EpicsGateway],
  exports: [EpicsService],
})
export class EpicsModule {}
