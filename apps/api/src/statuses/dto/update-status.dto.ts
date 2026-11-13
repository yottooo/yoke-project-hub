import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional } from 'class-validator';
import { CreateStatusDto } from './create-status.dto';

export class UpdateStatusDto extends PartialType(CreateStatusDto) {
  // Computed by the web app when a column is dragged; saved as sent.
  @IsOptional()
  @IsNumber()
  position?: number;
}
