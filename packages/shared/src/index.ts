// === Enums ===

export enum DeploymentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum EnvironmentStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN',
  UNKNOWN = 'UNKNOWN',
}

export enum PipelineStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum NotificationType {
  DEPLOYMENT_SUCCESS = 'DEPLOYMENT_SUCCESS',
  DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
  HEALTH_DOWN = 'HEALTH_DOWN',
  HEALTH_RECOVERED = 'HEALTH_RECOVERED',
  ROLLBACK = 'ROLLBACK',
}

export enum ChannelType {
  SLACK = 'SLACK',
  DISCORD = 'DISCORD',
  WEBHOOK = 'WEBHOOK',
}

export enum RepositoryProvider {
  GITHUB = 'GITHUB',
  GITLAB = 'GITLAB',
  BITBUCKET = 'BITBUCKET',
}

// === WebSocket Event Types ===

export enum WsEventType {
  DEPLOYMENT_STARTED = 'deployment:started',
  DEPLOYMENT_COMPLETED = 'deployment:completed',
  DEPLOYMENT_FAILED = 'deployment:failed',
  HEALTH_CHECK_UPDATED = 'health:updated',
  PIPELINE_UPDATED = 'pipeline:updated',
  NOTIFICATION_NEW = 'notification:new',
}

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
