import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { EpicsService } from './epics.service';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';
import { AuthGuard } from '../auth/auth.guard';

// No prefix: listing and creating live under a project, the rest under /epics.
@Controller()
@UseGuards(AuthGuard)
export class EpicsController {
  constructor(private readonly epicsService: EpicsService) {}

  @Get('projects/:projectId/epics')
  findAll(@Param('projectId', ParseIdPipe) projectId: number) {
    return this.epicsService.findAllForProject(projectId);
  }

  @Post('projects/:projectId/epics')
  create(
    @Param('projectId', ParseIdPipe) projectId: number,
    @Body() createEpicDto: CreateEpicDto,
  ) {
    return this.epicsService.create(projectId, createEpicDto);
  }

  @Patch('epics/:id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() updateEpicDto: UpdateEpicDto,
  ) {
    return this.epicsService.update(id, updateEpicDto);
  }

  // Returns the deleted epic (200); its tasks stay, with no epic.
  @Delete('epics/:id')
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.epicsService.remove(id);
  }
}
