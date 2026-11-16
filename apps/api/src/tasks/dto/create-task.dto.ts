import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_DB_ID } from '../../common/parse-id.pipe';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
  // IsOptional also accepts null, which the web app sends to clear a field.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
  // One of the project's statuses; a new task without one goes to the leftmost column.
  @IsOptional()
  @IsInt()
  statusId?: number;
  @IsOptional()
  @IsString()
  assignee?: string | null;
  // One of the project's epics; null takes the task out of its epic.
  // Bounded to the id column's range, so a huge number gives 400, not a database error.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_DB_ID)
  epicId?: number | null;
}
