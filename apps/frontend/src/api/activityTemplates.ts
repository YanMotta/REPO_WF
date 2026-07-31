import { ActivityPriority, ActivityTemplateDependencyDto, ActivityTemplateDto } from '@workflow-brasal/shared';
import { api } from './client';

export interface ActivityTemplateInput {
  title: string;
  description?: string;
  responsibleId?: number;
  priority?: ActivityPriority;
  businessDayOffset: number;
  dueTime?: string;
  estimatedHours?: number;
  notes?: string;
  isActive?: boolean;
  dependsOnTemplateIds?: number[];
}

export function listActivityTemplates(): Promise<ActivityTemplateDto[]> {
  return api.get<ActivityTemplateDto[]>('/activity-templates');
}

export function createActivityTemplate(input: ActivityTemplateInput): Promise<ActivityTemplateDto> {
  return api.post<ActivityTemplateDto>('/activity-templates', input);
}

export function updateActivityTemplate(
  id: number,
  input: Partial<ActivityTemplateInput>,
): Promise<ActivityTemplateDto> {
  return api.patch<ActivityTemplateDto>(`/activity-templates/${id}`, input);
}

export function getActivityTemplateDependencies(id: number): Promise<ActivityTemplateDependencyDto[]> {
  return api.get<ActivityTemplateDependencyDto[]>(`/activity-templates/${id}/dependencies`);
}
