import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
}
