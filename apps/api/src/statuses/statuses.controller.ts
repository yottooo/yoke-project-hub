import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { StatusesService } from './statuses.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AuthGuard } from '../auth/auth.guard';

// No prefix: listing and creating live under a project, the rest under /statuses.
@Controller()
@UseGuards(AuthGuard)
export class StatusesController {
  constructor(private readonly statusesService: StatusesService) {}

  @Get('projects/:projectId/statuses')
  findAll(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.statusesService.findAllForProject(projectId);
  }

  @Post('projects/:projectId/statuses')
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createStatusDto: CreateStatusDto,
  ) {
    return this.statusesService.create(projectId, createStatusDto);
  }

  @Patch('statuses/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.statusesService.update(id, updateStatusDto);
  }

  // Returns the deleted status (200); 409 while it still has tasks or is the last column.
  @Delete('statuses/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.statusesService.remove(id);
  }
}
