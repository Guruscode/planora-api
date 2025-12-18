import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  errors?: any;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => {
      // If controller already returns our format → don't wrap twice
      if (data && typeof data === 'object' && 'success' in data) {
        return data;
      }

      return {
        success: true,
        statusCode,
        message: this.getMessageFromStatus(statusCode),
        data: data ?? null,
      };
    }));
  }

  private getMessageFromStatus(status: number): string {
    const messages: Record<number, string> = {
      200: 'Success',
      201: 'Created successfully',
      204: 'No content',
    };
    return messages[status] || 'Request successful';
  }
}