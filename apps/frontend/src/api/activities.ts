import { ActivityDependencyDto, ActivityDto, ActivityPriority } from '@workflow-brasal/shared';
import { api } from './client';

export interface ActivityFilter {
  month?: number;
  year?: number;
  status?: string;
  projectId?: number;
  responsibleId?: number;
}

export interface CreateActivityDto {
  projectId: number;
  title: string;
  description?: string;
  responsibleId?: number;
  coResponsibleId?: number;
  priority?: ActivityPriority;
  startDate?: string;
  deadline?: string;
  businessDayOffset?: number;
  dueDateRuleMonth?: number;
  dueDateRuleYear?: number;
  dueTime?: string;
  templateId?: number;
  estimatedHours?: number;
  notes?: string;
  dependsOnActivityIds?: number[];
}

function toQueryString(filter: ActivityFilter): string {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listActivities(filter: ActivityFilter = {}): Promise<ActivityDto[]> {
  return api.get<ActivityDto[]>(`/activities${toQueryString(filter)}`);
}

export function createActivity(dto: CreateActivityDto): Promise<ActivityDto> {
  return api.post<ActivityDto>('/activities', dto);
}

export function getActivity(id: number): Promise<ActivityDto> {
  return api.get<ActivityDto>(`/activities/${id}`);
}

export function getActivityDependencies(id: number): Promise<ActivityDependencyDto[]> {
  return api.get<ActivityDependencyDto[]>(`/activities/${id}/dependencies`);
}

export function changeActivityStatus(id: number, status: string): Promise<ActivityDto> {
  return api.patch<ActivityDto>(`/activities/${id}/status`, { status });
}

export function changeActivityResponsible(id: number, responsibleId: number): Promise<ActivityDto> {
  return api.patch<ActivityDto>(`/activities/${id}/responsible`, { responsibleId });
}

export function changeActivityCoResponsible(
  id: number,
  coResponsibleId: number | null,
): Promise<ActivityDto> {
  return api.patch<ActivityDto>(`/activities/${id}/co-responsible`, { coResponsibleId });
}

export function generateClosure(month?: number, year?: number): Promise<{ created: number }> {
  return api.post<{ created: number }>('/closure/generate', { month, year });
}

export function deleteClosure(month: number, year: number): Promise<{ deleted: number }> {
  return api.delete<{ deleted: number }>(`/closure?month=${month}&year=${year}`);
}
