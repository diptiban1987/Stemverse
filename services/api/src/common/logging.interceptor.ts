import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method?: string; url?: string }>();
    const started = Date.now();
    const method = req.method ?? '?';
    const url = req.url ?? '?';

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - started;
        this.logger.log(JSON.stringify({ method, url, ms, status: 'ok' }));
      }),
    );
  }
}
