import { Prisma } from '@prisma/client';
import prisma from './database';

export type AssistantActionStatus = 'pending' | 'confirmed' | 'executed' | 'cancelled' | 'failed';

export interface AssistantActionPlan {
  id: string;
  description?: string;
  requiresConfirmation?: boolean;
  endpoint?: {
    method?: string;
    url?: string;
    body?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const VALID_STATUSES: AssistantActionStatus[] = ['pending', 'confirmed', 'executed', 'cancelled', 'failed'];

function toJsonValue(value: unknown): Prisma.JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  try {
    return value as Prisma.JsonValue;
  } catch (error) {
    return JSON.parse(JSON.stringify(value)) as Prisma.JsonValue;
  }
}

export async function storeAssistantActions(
  userId: string,
  sessionId: string | undefined,
  actions: AssistantActionPlan[],
): Promise<void> {
  if (!actions || actions.length === 0) {
    return;
  }

  const operations = actions.map((action) => {
    const endpoint = action.endpoint ?? {};
    const endpointMethod = (endpoint.method ?? 'POST').toString().toUpperCase();
    const endpointUrl = endpoint.url ?? '';

    return prisma.assistantAction.upsert({
      where: {
        actionId: action.id,
      },
      update: {
        userId,
        sessionId: sessionId ?? null,
        description: (action.description ?? '').toString(),
        endpointMethod,
        endpointUrl,
        payload: toJsonValue(action) ?? Prisma.JsonNull,
        requiresConfirmation: action.requiresConfirmation ?? true,
        status: 'pending',
        lastError: Prisma.JsonNull,
        confirmedAt: null,
        executedAt: null,
        cancelledAt: null,
      },
      create: {
        userId,
        sessionId: sessionId ?? null,
        actionId: action.id,
        description: (action.description ?? '').toString(),
        endpointMethod,
        endpointUrl,
        payload: toJsonValue(action) ?? Prisma.JsonNull,
        requiresConfirmation: action.requiresConfirmation ?? true,
      },
    });
  });

  await prisma.$transaction(operations);
}

export async function markActionConfirmed(userId: string, actionId: string): Promise<void> {
  await updateAction(userId, actionId, {
    status: 'confirmed',
    confirmedAt: new Date(),
    lastError: Prisma.JsonNull,
  });
}

export async function markActionExecuted(userId: string, actionId: string): Promise<void> {
  await updateAction(userId, actionId, {
    status: 'executed',
    executedAt: new Date(),
    lastError: Prisma.JsonNull,
  });
}

export async function markActionCancelled(userId: string, actionId: string): Promise<void> {
  await updateAction(userId, actionId, {
    status: 'cancelled',
    cancelledAt: new Date(),
  });
}

export async function markActionFailed(userId: string, actionId: string, error: unknown): Promise<void> {
  const serializedError = toJsonValue(serializeError(error)) ?? Prisma.JsonNull;

  await updateAction(userId, actionId, {
    status: 'failed',
    lastError: serializedError,
  });
}

export async function listAssistantActions(
  userId: string,
  status?: AssistantActionStatus,
): Promise<Prisma.AssistantActionGetPayload<object>[]> {
  const where: Prisma.AssistantActionWhereInput = {
    userId,
  };

  if (status && VALID_STATUSES.includes(status)) {
    where.status = status;
  }

  return prisma.assistantAction.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function getAssistantAction(userId: string, actionId: string) {
  return prisma.assistantAction.findFirst({
    where: {
      userId,
      actionId,
    },
  });
}

async function updateAction(userId: string, actionId: string, data: Prisma.AssistantActionUpdateManyMutationInput): Promise<void> {
  const result = await prisma.assistantAction.updateMany({
    where: {
      userId,
      actionId,
    },
    data,
  });

  if (result.count === 0) {
    throw new Error(`Assistant action not found for actionId=${actionId}`);
  }
}

function serializeError(error: unknown): Record<string, unknown> {
  if (!error) {
    return { message: 'Unknown error' };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: 'Unknown error',
    detail: error,
  };
}
