import { IssueType, RequestStatus } from './api';

export const ISSUES: { value: IssueType; label: string }[] = [
  { value: 'flat_tyre', label: 'Flat tyre' },
  { value: 'battery', label: 'Battery' },
  { value: 'fuel', label: 'Out of fuel' },
  { value: 'towing', label: 'Towing' },
  { value: 'engine', label: 'Engine trouble' },
  { value: 'other', label: 'Something else' },
];

export function issueLabel(issue: IssueType): string {
  return ISSUES.find((i) => i.value === issue)?.label ?? issue;
}

// What the customer is told about where their request is.
export const STATUS_TEXT: Record<RequestStatus, string> = {
  requested: 'Looking for a provider',
  assigned: 'Waiting for a provider to accept',
  accepted: 'A provider accepted your request',
  en_route: 'Your provider is on the way',
  arrived: 'Your provider has arrived',
  in_progress: 'Work is in progress',
  completed: 'Job completed',
  cancelled: 'Request cancelled',
  no_provider: 'No provider is available right now',
};

// The steps shown as a progress list on the request screen.
export const STEPS: { status: RequestStatus; label: string }[] = [
  { status: 'assigned', label: 'Provider found' },
  { status: 'accepted', label: 'Accepted' },
  { status: 'en_route', label: 'On the way' },
  { status: 'arrived', label: 'Arrived' },
  { status: 'in_progress', label: 'Working' },
  { status: 'completed', label: 'Completed' },
];

const ORDER: RequestStatus[] = ['requested', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed'];

// How many steps are done for a given status.
export function stepIndex(status: RequestStatus): number {
  return ORDER.indexOf(status);
}

export const FINISHED: RequestStatus[] = ['completed', 'cancelled'];
export const CANCELLABLE: RequestStatus[] = ['requested', 'assigned', 'accepted', 'en_route', 'arrived', 'no_provider'];

// The next button a provider sees for the job they are doing.
export const NEXT_JOB_STEP: Partial<
  Record<RequestStatus, { status: 'en_route' | 'arrived' | 'in_progress' | 'completed'; label: string }>
> = {
  accepted: { status: 'en_route', label: 'Start driving to the customer' },
  en_route: { status: 'arrived', label: "I've arrived" },
  arrived: { status: 'in_progress', label: 'Start the work' },
  in_progress: { status: 'completed', label: 'Mark the job complete' },
};
