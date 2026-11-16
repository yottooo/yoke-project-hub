import { BadRequestException, PipeTransform } from '@nestjs/common';

/** Largest value of a Postgres `integer` (serial) column. */
export const MAX_DB_ID = 2_147_483_647;

/**
 * A database id from the URL: a positive whole number within the integer column's range,
 * so `99999999999` gives 400 instead of a database error (500) and `-1` or `1.5` give 400.
 *
 * The global ValidationPipe (transform: true) has already turned the text into a number
 * by the time this runs, so number spellings such as `3e0` arrive as 3 and are accepted.
 */
export class ParseIdPipe implements PipeTransform<string | number, number> {
  transform(value: string | number): number {
    const id = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(id) || id < 1 || id > MAX_DB_ID) {
      throw new BadRequestException('Id must be a whole number');
    }
    return id;
  }
}
