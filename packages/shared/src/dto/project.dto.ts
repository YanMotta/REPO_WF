import { ProjectStatus } from '../enums';

export interface ProjectDto {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: number | null;
  startDate: string | null;
  endDate: string | null;
}
