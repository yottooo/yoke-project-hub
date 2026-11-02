import type { StatusColor } from './entities/status.entity';

/** The columns every new project starts with. The AddStatuses migration repeats these in SQL. */
export const DEFAULT_STATUSES: {
  name: string;
  color: StatusColor;
  position: number;
}[] = [
  { name: 'To do', color: 'slate', position: 1000 },
  { name: 'In progress', color: 'blue', position: 2000 },
  { name: 'Done', color: 'green', position: 3000 },
];
