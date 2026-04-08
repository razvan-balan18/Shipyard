// === Enums ===

export const DeploymentStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  ROLLED_BACK: 'ROLLED_BACK',
} as const;
export type DeploymentStatus = (typeof DeploymentStatus)[keyof typeof DeploymentStatus];

export const EnvironmentStatus = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  DOWN: 'DOWN',
  UNKNOWN: 'UNKNOWN',
} as const;
export type EnvironmentStatus = (typeof EnvironmentStatus)[keyof typeof EnvironmentStatus];

export const PipelineStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type PipelineStatus = (typeof PipelineStatus)[keyof typeof PipelineStatus];

export const UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const NotificationType = {
  DEPLOYMENT_SUCCESS: 'DEPLOYMENT_SUCCESS',
  DEPLOYMENT_FAILED: 'DEPLOYMENT_FAILED',
  HEALTH_DOWN: 'HEALTH_DOWN',
  HEALTH_RECOVERED: 'HEALTH_RECOVERED',
  ROLLBACK: 'ROLLBACK',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const ChannelType = {
  SLACK: 'SLACK',
  DISCORD: 'DISCORD',
  WEBHOOK: 'WEBHOOK',
} as const;
export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];

export const RepositoryProvider = {
  GITHUB: 'GITHUB',
  GITLAB: 'GITLAB',
  BITBUCKET: 'BITBUCKET',
} as const;
export type RepositoryProvider = (typeof RepositoryProvider)[keyof typeof RepositoryProvider];

// === WebSocket Event Types ===

export const WsEventType = {
  DEPLOYMENT_STARTED: 'deployment:started',
  DEPLOYMENT_COMPLETED: 'deployment:completed',
  DEPLOYMENT_FAILED: 'deployment:failed',
  HEALTH_CHECK_UPDATED: 'health:updated',
  PIPELINE_UPDATED: 'pipeline:updated',
  NOTIFICATION_NEW: 'notification:new',
} as const;
export type WsEventType = (typeof WsEventType)[keyof typeof WsEventType];

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
  timestamp: string;
}

// === API Response Types ===

export interface ServiceSummary {
  id: string;
  name: string;
  displayName: string;
  repositoryUrl: string;
  environments: EnvironmentSummary[];
  lastDeployment: DeploymentSummary | null;
}

export interface EnvironmentSummary {
  id: string;
  name: string;
  displayName: string;
  status: EnvironmentStatus;
  currentDeployment: DeploymentSummary | null;
  url: string | null;
}

export interface DeploymentSummary {
  id: string;
  status: DeploymentStatus;
  commitSha: string;
  commitMessage: string;
  branch: string;
  imageTag: string | null;
  duration: number | null;
  startedAt: string;
  finishedAt: string | null;
  triggeredBy: string;
  serviceName: string;
  environmentName: string;
}

export interface PipelineRunSummary {
  id: string;
  externalId: string;
  status: PipelineStatus;
  workflowName: string;
  branch: string;
  commitSha: string;
  url: string;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
  stages: PipelineStage[];
}

export interface PipelineStage {
  name: string;
  status: PipelineStatus;
  duration: number | null;
}

export interface HealthCheckResultSummary {
  id: string;
  status: EnvironmentStatus;
  responseTime: number | null;
  statusCode: number | null;
  errorMessage: string | null;
  environmentId: string;
  createdAt: string;
}

export interface EnvironmentHealthSummary {
  environmentId: string;
  environmentName: string;
  serviceId: string;
  serviceName: string;
  status: EnvironmentStatus;
  lastCheckAt: string | null;
  healthCheckUrl: string | null;
  healthCheckInterval: number;
  lastResult: HealthCheckResultSummary | null;
}

// === API Request Types ===

export interface CreateServiceRequest {
  name: string;
  displayName: string;
  description?: string;
  repositoryUrl: string;
  repositoryProvider: RepositoryProvider;
  defaultBranch?: string;
  dockerImage?: string;
}

export interface CreateEnvironmentRequest {
  name: string;
  displayName: string;
  order: number;
  url?: string;
  healthCheckUrl?: string;
  healthCheckInterval?: number;
  serviceId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  teamName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
    teamId: string;
    teamName: string;
  };
}

// === Notification Types ===

export interface NotificationSummary {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  userId: string | null;
  teamId: string;
  createdAt: string;
}

export interface NotificationChannelSummary {
  id: string;
  type: ChannelType;
  name: string;
  config: Record<string, unknown>;
  events: string[];
  enabled: boolean;
  teamId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationChannelRequest {
  type: ChannelType;
  name: string;
  config: Record<string, unknown>;
  events: string[];
  enabled?: boolean;
}

export interface UpdateNotificationChannelRequest {
  name?: string;
  config?: Record<string, unknown>;
  events?: string[];
  enabled?: boolean;
}
