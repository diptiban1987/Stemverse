import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

type PresenceUser = {
  userId: string;
  displayName?: string;
  color: string;
};

type ProjectRoomState = {
  presence: Map<string, PresenceUser>;
  lock?: { userId: string; acquiredAt: number };
  activity: Array<{ userId: string; action: string; at: number }>;
};

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/collaboration',
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CollaborationGateway.name);
  private readonly rooms = new Map<string, ProjectRoomState>();
  private readonly socketIndex = new Map<string, { projectId: string; userId: string }>();

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const meta = this.socketIndex.get(client.id);
    if (!meta) return;
    const room = this.rooms.get(meta.projectId);
    if (room) {
      room.presence.delete(meta.userId);
      this.server.to(meta.projectId).emit('presence:leave', { userId: meta.userId });
    }
    this.socketIndex.delete(client.id);
  }

  @SubscribeMessage('project:join')
  joinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { projectId: string; userId: string; displayName?: string },
  ) {
    const { projectId, userId, displayName } = body;
    client.join(projectId);
    this.socketIndex.set(client.id, { projectId, userId });

    if (!this.rooms.has(projectId)) {
      this.rooms.set(projectId, { presence: new Map(), activity: [] });
    }
    const room = this.rooms.get(projectId)!;
    room.presence.set(userId, {
      userId,
      displayName,
      color: `#${userId.slice(0, 6)}`,
    });

    client.emit('presence:sync', {
      users: [...room.presence.values()],
      lock: room.lock ?? null,
      activity: room.activity.slice(-20),
    });
    client.to(projectId).emit('presence:join', room.presence.get(userId));
    return { ok: true };
  }

  @SubscribeMessage('workspace:lock')
  acquireLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { projectId: string; userId: string },
  ) {
    const room = this.ensureRoom(body.projectId);
    if (room.lock && room.lock.userId !== body.userId) {
      return { ok: false, lock: room.lock };
    }
    room.lock = { userId: body.userId, acquiredAt: Date.now() };
    this.server.to(body.projectId).emit('workspace:lock', room.lock);
    this.pushActivity(body.projectId, body.userId, 'acquired lock');
    return { ok: true, lock: room.lock };
  }

  @SubscribeMessage('workspace:unlock')
  releaseLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { projectId: string; userId: string },
  ) {
    const room = this.ensureRoom(body.projectId);
    if (room.lock?.userId === body.userId) {
      room.lock = undefined;
      this.server.to(body.projectId).emit('workspace:unlock', { userId: body.userId });
      this.pushActivity(body.projectId, body.userId, 'released lock');
    }
    return { ok: true };
  }

  @SubscribeMessage('workspace:save')
  liveSave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { projectId: string; userId: string; savedAt: number },
  ) {
    this.pushActivity(body.projectId, body.userId, 'saved workspace');
    client.to(body.projectId).emit('workspace:save', {
      userId: body.userId,
      savedAt: body.savedAt,
    });
    return { ok: true };
  }

  @SubscribeMessage('cursor:move')
  cursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { projectId: string; userId: string; x: number; y: number },
  ) {
    client.to(body.projectId).emit('cursor:move', {
      userId: body.userId,
      x: body.x,
      y: body.y,
    });
  }

  private ensureRoom(projectId: string): ProjectRoomState {
    if (!this.rooms.has(projectId)) {
      this.rooms.set(projectId, { presence: new Map(), activity: [] });
    }
    return this.rooms.get(projectId)!;
  }

  private pushActivity(projectId: string, userId: string, action: string) {
    const room = this.ensureRoom(projectId);
    room.activity.push({ userId, action, at: Date.now() });
    if (room.activity.length > 50) room.activity.shift();
    this.server.to(projectId).emit('activity:feed', room.activity.slice(-10));
  }
}
