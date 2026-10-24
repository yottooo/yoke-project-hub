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

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  /** Order inside a column, ascending. Any number; gaps are fine. */
  position: number;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  assignee?: string | null;
}

export type UpdateTaskInput = Partial<
  Pick<Task, 'title' | 'description' | 'status' | 'position' | 'assignee'>
>;

export interface ChatMessage {
  projectId: number;
  text: string;
  /** The sender's socket id; the API has no users yet. */
  senderId: string;
  sentAt: string;
}
