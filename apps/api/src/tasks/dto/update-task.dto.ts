import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  // Computed by the web app when a card is dropped; saved as sent.
  @IsOptional()
  @IsNumber()
  position?: number;
}
