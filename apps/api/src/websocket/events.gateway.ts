import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

interface JwtPayload {
  sub: string;
  teamId: string;
  [key: string]: unknown;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  },
  // Namespace keeps WebSocket traffic separate from the REST API
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('EventsGateway');

  constructor(private jwtService: JwtService) {}

  // Called when a client connects
  async handleConnection(client: Socket) {
    try {
      // Extract JWT from the connection handshake
      const authHeader = client.handshake.headers?.authorization;
      const token: string | undefined =
        (client.handshake.auth?.token as string | undefined) ||
        (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);

      if (!token) {
        this.logger.warn('Client connected without token, disconnecting');
        client.disconnect();
        return;
      }

      // Verify the JWT — algorithm pinned to HS256 via WebsocketModule's JwtModule config
      const payload = this.jwtService.verify<JwtPayload>(token);

      // Validate teamId before joining room
      if (typeof payload.teamId !== 'string' || !payload.teamId) {
        this.logger.warn(`Client ${client.id} has invalid teamId in token`);
        client.disconnect();
        return;
      }

      // Join the client to their team's room
      // This way, events are only broadcast to the relevant team
      await client.join(`team:${payload.teamId}`);

      this.logger.log(`Client ${client.id} joined team:${payload.teamId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Client ${client.id} failed auth: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // Public method for other services to emit events
  // When a deployment happens, DeploymentsService calls this
  emitToTeam(teamId: string, event: string, payload: Record<string, unknown>) {
    if (!teamId) return;
    this.server.to(`team:${teamId}`).emit(event, {
      type: event,
      payload,
      timestamp: new Date().toISOString(),
    });
  }
}
