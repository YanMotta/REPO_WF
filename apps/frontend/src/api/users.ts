import { Role, UserDto } from '@workflow-brasal/shared';
import { api } from './client';

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role?: Role;
}

export function listUsers(): Promise<UserDto[]> {
  return api.get<UserDto[]>('/users');
}

export function updateUser(id: number, input: UpdateUserInput): Promise<UserDto> {
  return api.patch<UserDto>(`/users/${id}`, input);
}

/** Admin-created account — the new user gets an e-mail to set their own password, rather than
 * self-registering. */
export function createUser(input: CreateUserInput): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/create-user', input);
}
