import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ProjectsService } from '../projects/projects.service';

@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly projectsService: ProjectsService) {}
  
  @SubscribeMessage('joinProject')
  async handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: number },
  ) {
    const { projectId } = payload;
    
    try {
      await this.projectsService.findOne(projectId);
    } catch {
      this.logger.warn(`Join rejected, project ${projectId} not found`);
      return { event: 'error', data: { message: `Project ${projectId} not found` } };
    }

    await client.join(this.roomName(projectId));
    this.logger.log(`Client joined project: ${projectId}`);
    return { event: 'joinedProject', data: { projectId } };
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: number; text: string },
  ) {
    const { projectId, text } = payload;
    this.logger.log(`Sending message to project: ${projectId}`);
    this.server.to(this.roomName(projectId)).emit('newMessage', {
      projectId,
      text,
      senderId: client.id,
      sentAt: new Date(),
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private roomName(projectId: number): string {
    return `project-${projectId}`;
  }
}
