import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ActivityStatus } from '@workflow-brasal/shared';
import { assertManualStatusTransition } from './activities.rules';

describe('assertManualStatusTransition', () => {
  it('forbids manually setting READY_TO_START', () => {
    expect(() =>
      assertManualStatusTransition(ActivityStatus.BACKLOG, ActivityStatus.READY_TO_START, 0),
    ).toThrow(ForbiddenException);
  });

  it('forbids manually setting LATE', () => {
    expect(() =>
      assertManualStatusTransition(ActivityStatus.IN_PROGRESS, ActivityStatus.LATE, 0),
    ).toThrow(ForbiddenException);
  });

  it('forbids IN_PROGRESS while blocked by open dependencies', () => {
    expect(() =>
      assertManualStatusTransition(ActivityStatus.READY_TO_START, ActivityStatus.IN_PROGRESS, 2),
    ).toThrow(BadRequestException);
  });

  it('allows IN_PROGRESS once dependencies are resolved', () => {
    expect(() =>
      assertManualStatusTransition(ActivityStatus.READY_TO_START, ActivityStatus.IN_PROGRESS, 0),
    ).not.toThrow();
  });

  it('allows other manual transitions such as DONE', () => {
    expect(() =>
      assertManualStatusTransition(ActivityStatus.IN_PROGRESS, ActivityStatus.DONE, 0),
    ).not.toThrow();
  });

  it('allows setting TO_DO/BACKLOG manually', () => {
    expect(() =>
      assertManualStatusTransition(ActivityStatus.BACKLOG, ActivityStatus.TO_DO, 0),
    ).not.toThrow();
  });
});
