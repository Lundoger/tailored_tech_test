import type { Prisma } from '@data-room/db';
import { type ConflictStrategy, suggestAvailableName } from '@data-room/shared';

import { AppError } from '../common/app-error';

interface ResolveNameParams {
  dataRoomId: string;
  parentId: string | null;
  desiredName: string;
  strategy: ConflictStrategy;
  excludeNodeId?: string;
}

export interface ResolvedName {
  name: string;
  conflictingNodeId: string | null;
}

export async function resolveNodeName(
  tx: Prisma.TransactionClient,
  { dataRoomId, parentId, desiredName, strategy, excludeNodeId }: ResolveNameParams,
): Promise<ResolvedName> {
  const siblings = await tx.node.findMany({
    where: {
      dataRoomId,
      parentId,
      deletedAt: null,
      ...(excludeNodeId ? { id: { not: excludeNodeId } } : {}),
    },
    select: { id: true, name: true },
  });

  const clash = siblings.find(
    (sibling) => sibling.name.toLowerCase() === desiredName.toLowerCase(),
  );

  if (!clash) {
    return { name: desiredName, conflictingNodeId: null };
  }

  switch (strategy) {
    case 'VERSION':
      return { name: clash.name, conflictingNodeId: clash.id };

    case 'RENAME':
      return {
        name: suggestAvailableName(
          desiredName,
          siblings.map((sibling) => sibling.name),
        ),
        conflictingNodeId: clash.id,
      };

    case 'FAIL':
      throw AppError.nameConflict(
        desiredName,
        suggestAvailableName(
          desiredName,
          siblings.map((sibling) => sibling.name),
        ),
      );
  }
}

export function isNameConflictError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

interface TransactionCapable {
  $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

const MAX_ATTEMPTS = 3;

export async function withResolvedName<T>(
  prisma: TransactionCapable,
  params: ResolveNameParams,
  work: (resolved: ResolvedName, tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const resolved = await resolveNodeName(tx, params);
        return work(resolved, tx);
      });
    } catch (error) {
      if (!isNameConflictError(error) || attempt === MAX_ATTEMPTS) {
        if (isNameConflictError(error)) {
          await prisma.$transaction((tx) => resolveNodeName(tx, { ...params, strategy: 'FAIL' }));
        }
        throw error;
      }
    }
  }

  throw AppError.nameConflict(params.desiredName, params.desiredName);
}
