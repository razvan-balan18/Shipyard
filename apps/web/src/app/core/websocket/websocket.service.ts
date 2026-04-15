import { Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../auth/auth.service';
import { WsEvent, WsEventType } from '@shipyard/shared';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;

  // Use a Subject (RxJS) for WebSocket events because they're a stream of values
  // over time — exactly what RxJS is designed for
  private events$ = new Subject<WsEvent>();

  // Signal for connection status — it's a single current value, perfect for signals
  connectionStatus = signal<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  constructor(private authService: AuthService) {}

  connect(): void {
    if (this.socket?.connected) return;

    // getToken() returns null if token is expired and triggers logout
    const token = this.authService.getToken();
    if (!token) return;

    // Connect to the /events namespace on the backend
    this.socket = io(`${environment.wsUrl}/events`, {
      auth: { token },
      reconnection: true, // Auto-reconnect
      reconnectionAttempts: 10, // Try 10 times
      reconnectionDelay: 1000, // Start with 1s delay
      reconnectionDelayMax: 30000, // Max 30s between attempts
    });

    this.socket.on('connect', () => {
      this.connectionStatus.set('connected');
      if (!environment.production) console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      this.connectionStatus.set('disconnected');
      if (!environment.production) console.log('WebSocket disconnected');
    });

    this.socket.on('reconnect_attempt', () => {
      this.connectionStatus.set('reconnecting');
    });

    // Listen for all event types and push them into the Subject
    Object.values(WsEventType).forEach((eventType) => {
      this.socket!.on(eventType, (data: WsEvent) => {
        this.events$.next(data);
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connectionStatus.set('disconnected');
  }

  // Components subscribe to specific event types
  on<T>(eventType: WsEventType): Observable<WsEvent<T>> {
    return this.events$
      .asObservable()
      .pipe(filter((event) => event.type === eventType)) as Observable<WsEvent<T>>;
  }

  // Convenience method: get all events
  allEvents() {
    return this.events$.asObservable();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
