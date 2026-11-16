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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthGuard } from '../auth/auth.guard';

// No prefix: listing and creating live under a project, the rest under /tasks.
@Controller()
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('projects/:projectId/tasks')
  findAll(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.tasksService.findAllForProject(projectId);
  }

  @Post('projects/:projectId/tasks')
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(projectId, createTaskDto);
  }

  @Patch('tasks/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, updateTaskDto);
  }

  // Returns the deleted task (200), as the web app's contract says.
  @Delete('tasks/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }
}
