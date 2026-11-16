import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  STATUS_COLORS,
  type StatusColor,
} from '../../statuses/entities/status.entity';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
// Postgres text can't hold NUL; without this check it reaches the database and gives a 500.
// eslint-disable-next-line no-control-regex -- matching NUL is the point
const NO_NUL = /^[^\u0000]*$/;
const NO_NUL_MESSAGE = '$property cannot contain a NUL character';

export class CreateEpicDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(NO_NUL, { message: NO_NUL_MESSAGE })
  // trim() keeps zero-width spaces, which would make an invisible chip.
  @Matches(/[\p{L}\p{N}\p{P}\p{S}]/u, {
    message: '$property needs at least one visible character',
  })
  name: string;

  // IsOptional also accepts null, which the web app sends to clear a field.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(NO_NUL, { message: NO_NUL_MESSAGE })
  description?: string | null;

  // Null is refused in the service: the column is NOT NULL.
  @IsOptional()
  @IsIn(STATUS_COLORS, {
    message: `Color must be one of ${STATUS_COLORS.join(', ')}`,
  })
  color?: StatusColor;

  // A calendar day; strict rejects impossible days such as 2026-02-30.
  @IsOptional()
  @Matches(DAY, { message: '$property must be a date in YYYY-MM-DD form' })
  @IsDateString(
    { strict: true },
    { message: '$property is not a day that exists' },
  )
  startDate?: string | null;

  @IsOptional()
  @Matches(DAY, { message: '$property must be a date in YYYY-MM-DD form' })
  @IsDateString(
    { strict: true },
    { message: '$property is not a day that exists' },
  )
  endDate?: string | null;
}
