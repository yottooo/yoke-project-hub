import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { Status } from './entities/status.entity';

// Broadcasts column changes to the `project-{id}` room that ChatGateway's joinProject fills.
@WebSocketGateway()
export class StatusesGateway {
  @WebSocketServer()
  server!: Server;

  @OnEvent('status.created')
  handleCreated(status: Status) {
    this.server
      .to(this.roomName(status.projectId))
      .emit('statusCreated', status);
  }

  @OnEvent('status.updated')
  handleUpdated(status: Status) {
    this.server
      .to(this.roomName(status.projectId))
      .emit('statusUpdated', status);
  }

  @OnEvent('status.deleted')
  handleDeleted(payload: { id: number; projectId: number }) {
    this.server
      .to(this.roomName(payload.projectId))
      .emit('statusDeleted', payload);
  }

  private roomName(projectId: number): string {
    return `project-${projectId}`;
  }
}
