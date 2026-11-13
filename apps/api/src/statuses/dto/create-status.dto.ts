import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { STATUS_COLORS, type StatusColor } from '../entities/status.entity';

export class CreateStatusDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsIn(STATUS_COLORS, {
    message: `Color must be one of ${STATUS_COLORS.join(', ')}`,
  })
  color?: StatusColor;
}
