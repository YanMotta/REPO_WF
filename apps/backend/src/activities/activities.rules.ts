import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ActivityStatus, SYSTEM_ONLY_STATUSES } from '@workflow-brasal/shared';

/**
 * Guards manual status changes (i.e. requests coming through the API, as opposed to system-driven
 * transitions like the late-job or the dependency-resolution listener).
 * - READY_TO_START and LATE can only ever be assigned by the system.
 * - IN_PROGRESS is blocked while the activity still has unresolved (non-DONE) dependencies.
 */
export function assertManualStatusTransition(
  current: ActivityStatus,
  target: ActivityStatus,
  blockedByCount: number,
): void {
  if (SYSTEM_ONLY_STATUSES.has(target)) {
    throw new ForbiddenException(
      `Status ${target} can only be assigned by the system, not through a manual request`,
    );
  }
  if (target === ActivityStatus.IN_PROGRESS && blockedByCount > 0) {
    throw new BadRequestException(
      `Activity cannot move to IN_PROGRESS while it has ${blockedByCount} unresolved dependenc${blockedByCount === 1 ? 'y' : 'ies'}`,
    );
  }
}
