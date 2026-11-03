import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class UserCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const req = context.switchToHttp().getRequest();
    if (req.method !== 'GET') return null;
    const userId = req.user.id;
    const reqSubPath = req.url.split('/')[3] || 'profile';
    const cachePath = `user/${reqSubPath}/${userId}`;
    return cachePath;
  }
}
