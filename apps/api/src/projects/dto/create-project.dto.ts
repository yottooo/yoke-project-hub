import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name: string;
  @IsString()
  @MaxLength(200)
  @IsOptional()
  description?: string;
  @Type(() => Date)
  @IsDate()
  startDate: Date;
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;
  @IsOptional()
  @IsIn(['active', 'inactive', 'completed'], {
    message: 'Status must be active, inactive or completed',
  })
  status?: 'active' | 'inactive' | 'completed';
  @IsString()
  owner: string;
  @IsArray()
  @IsString({ each: true })
  team: string[];
}
