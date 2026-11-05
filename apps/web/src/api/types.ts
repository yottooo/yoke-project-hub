// Shapes shared with the Nest API (see apps/web/README.md for the contract).

export type ProjectStatus = 'active' | 'inactive' | 'completed';

export interface Project {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  endDate: string | null;
  status: ProjectStatus;
  owner: string;
  team: string[];
}

export interface CreateProjectInput {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  status?: ProjectStatus;
  owner: string;
  team: string[];
}

export interface User {
  id: number;
  email: string;
  /** Optional at sign-up, so it can be missing. */
  name: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name?: string;
}

export const STATUS_COLORS = [
  'slate',
  'blue',
  'green',
  'amber',
  'red',
  'purple',
  'pink',
  'teal',
] as const;

export type StatusColor = (typeof STATUS_COLORS)[number];

/** A board column. Each project has its own. */
export interface TaskStatus {
  id: number;
  projectId: number;
  /** 1–50 characters, unique within the project (ignoring case). */
  name: string;
  color: StatusColor;
  /** Order on the board, left to right, ascending. Any number; gaps are fine. */
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStatusInput {
  name: string;
  color?: StatusColor;
}

export type UpdateStatusInput = Partial<
  Pick<TaskStatus, 'name' | 'color' | 'position'>
>;

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  /** The id of the task's column (a TaskStatus of the same project). */
  statusId: number;
  /** Order inside a column, ascending. Any number; gaps are fine. */
  position: number;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  /** Leave out to use the project's leftmost column. */
  statusId?: number;
  assignee?: string | null;
}

export type UpdateTaskInput = Partial<
  Pick<Task, 'title' | 'description' | 'statusId' | 'position' | 'assignee'>
>;

export interface ChatMessage {
  projectId: number;
  text: string;
  /** The sender's socket id; the API has no users yet. */
  senderId: string;
  sentAt: string;
}
