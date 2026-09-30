import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Las escrituras sobre un ticket van con `where: { id, status: <leído> }`: si otra operación
 * cambió el estado entre la lectura y la escritura, Prisma no encuentra la fila (P2025) y
 * respondemos 409 en vez de pisar ese cambio (p. ej. reabrir un ticket recién cerrado).
 */
export async function failOnStaleStatus<T>(write: Promise<T>): Promise<T> {
  try {
    return await write;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      throw new ConflictException(
        'El ticket cambió mientras lo editabas. Recarga para ver su estado actual.',
      );
    }
    throw err;
  }
}
