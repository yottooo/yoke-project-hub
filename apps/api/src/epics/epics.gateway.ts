import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { Epic } from './entities/epic.entity';

// Broadcasts epic changes to the `project-{id}` room that ChatGateway's joinProject fills.
@WebSocketGateway()
export class EpicsGateway {
  @WebSocketServer()
  server!: Server;

  @OnEvent('epic.created')
  handleCreated(epic: Epic) {
    this.server.to(this.roomName(epic.projectId)).emit('epicCreated', epic);
  }

  @OnEvent('epic.updated')
  handleUpdated(epic: Epic) {
    this.server.to(this.roomName(epic.projectId)).emit('epicUpdated', epic);
  }

  // The deleted epic's tasks lost their epicId too, so clients reload tasks on this.
  @OnEvent('epic.deleted')
  handleDeleted(payload: { id: number; projectId: number }) {
    this.server
      .to(this.roomName(payload.projectId))
      .emit('epicDeleted', payload);
  }

  private roomName(projectId: number): string {
    return `project-${projectId}`;
  }
}
