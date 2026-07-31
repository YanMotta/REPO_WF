import { UserDto } from '@workflow-brasal/shared';
import { api } from './client';

export function listUsers(): Promise<UserDto[]> {
  return api.get<UserDto[]>('/users');
}
