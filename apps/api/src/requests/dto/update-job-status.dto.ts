import { IsIn } from 'class-validator';

// The steps a provider moves a job through, in order.
const JOB_STATUSES = ['en_route', 'arrived', 'in_progress', 'completed'] as const;

export class UpdateJobStatusDto {
  @IsIn(JOB_STATUSES)
  status!: (typeof JOB_STATUSES)[number];
}
