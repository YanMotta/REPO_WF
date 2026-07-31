import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { Activity } from '../activities/entities/activity.entity';
import { ActivityDependency } from '../activities/entities/activity-dependency.entity';
import { ActivityHistory } from '../activities/entities/activity-history.entity';
import { ActivityTemplate } from '../activity-templates/entities/activity-template.entity';
import { ActivityTemplateDependency } from '../activity-templates/entities/activity-template-dependency.entity';
import { NotificationLog } from '../notifications/entities/notification-log.entity';

export const allEntities = [
  User,
  Project,
  Activity,
  ActivityDependency,
  ActivityHistory,
  ActivityTemplate,
  ActivityTemplateDependency,
  NotificationLog,
];
