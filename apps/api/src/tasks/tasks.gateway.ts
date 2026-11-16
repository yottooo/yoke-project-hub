import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { Task } from './entities/task.entity';

// Broadcasts task changes to the `project-{id}` room that ChatGateway's joinProject fills.
@WebSocketGateway()
export class TasksGateway {
  @WebSocketServer()
  server!: Server;

  @OnEvent('task.created')
  handleCreated(task: Task) {
    this.server.to(this.roomName(task.projectId)).emit('taskCreated', task);
  }

  @OnEvent('task.updated')
  handleUpdated(task: Task) {
    this.server.to(this.roomName(task.projectId)).emit('taskUpdated', task);
  }

  @OnEvent('task.deleted')
  handleDeleted(payload: { id: number; projectId: number }) {
    this.server
      .to(this.roomName(payload.projectId))
      .emit('taskDeleted', payload);
  }

  private roomName(projectId: number): string {
    return `project-${projectId}`;
  }
}
