import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import { InternalReplyTicketDto } from './support.dto.js';

// Mismas opciones que el ValidationPipe global (main.ts).
const parse = (isInternal: unknown) =>
  plainToInstance(
    InternalReplyTicketDto,
    { body: 'hola', isInternal },
    { enableImplicitConversion: true },
  ).isInternal;

describe('InternalReplyTicketDto.isInternal', () => {
  it('reads multipart strings literally: only "true" is an internal note', () => {
    expect(parse('false')).toBe(false);
    expect(parse('true')).toBe(true);
    expect(parse(true)).toBe(true);
    expect(parse(undefined)).toBe(false);
    expect(parse('')).toBe(false);
  });
});
