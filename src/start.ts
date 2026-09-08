import { createStart } from '@tanstack/react-start';
import { apiMiddleware } from '@/lib/api-middleware';

export const startInstance = createStart(() => ({
  requestMiddleware: [apiMiddleware],
}));