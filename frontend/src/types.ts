export interface User {
  id: string;
  email: string;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
}

export interface Group {
  id: string;
  name: string;
  created_at: string;
}

export interface Member {
  id: string;
  email: string;
}

export type DataFormat = "csv" | "json";

export interface Datasource {
  id: string;
  owner_id: string;
  group_id: string | null;
  name: string;
  format: DataFormat;
  created_at: string;
}

export type JobStatus = "pending" | "running" | "done" | "error";

export interface PipelineStep {
  op: string;
  [key: string]: unknown;
}

export interface Job {
  id: string;
  name: string;
  owner_id: string;
  datasource_id: string;
  status: JobStatus;
  pipeline: PipelineStep[];
  result: unknown | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthStatus {
  status: "ok" | "degraded";
  db: string;
  redis: string;
}
