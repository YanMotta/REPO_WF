import { Role, UserDto } from '@workflow-brasal/shared';
import { api } from './client';

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

export function listUsers(): Promise<UserDto[]> {
  return api.get<UserDto[]>('/users');
}

export function updateUser(id: number, input: UpdateUserInput): Promise<UserDto> {
  return api.patch<UserDto>(`/users/${id}`, input);
}
