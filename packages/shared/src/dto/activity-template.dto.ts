import { ActivityPriority } from '../enums';

export interface ActivityTemplateDto {
  id: number;
  title: string;
  description: string | null;
  responsibleId: number | null;
  priority: ActivityPriority;
  businessDayOffset: number;
  dueTime: string | null;
  estimatedHours: number | null;
  notes: string | null;
  isActive: boolean;
}

export interface ActivityTemplateDependencyDto {
  id: number;
  templateId: number;
  dependsOnTemplateId: number;
}
