import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional } from 'class-validator';
import { CreateEpicDto } from './create-epic.dto';

export class UpdateEpicDto extends PartialType(CreateEpicDto) {
  // Computed by the web app when an epic is reordered; saved as sent.
  @IsOptional()
  @IsNumber()
  position?: number;
}
