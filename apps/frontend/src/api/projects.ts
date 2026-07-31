import { ProjectDto } from '@workflow-brasal/shared';
import { api } from './client';

export function listProjects(): Promise<ProjectDto[]> {
  return api.get<ProjectDto[]>('/projects');
}
