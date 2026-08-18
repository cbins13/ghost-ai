import type { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export type DesignEffectType = "node" | "edge" | "status" | "presence" | "chat-message"

/**
 * Records a pending effect before it runs and marks it applied afterward,
 * keyed uniquely by (runId, actionId, effectType). If an effect is already
 * confirmed applied, it is skipped. If a prior attempt left it pending
 * (e.g. a crashed or retried run), `apply` is invoked again — callers are
 * expected to make `apply` reconcile against actual Liveblocks state rather
 * than blindly re-mutate.
 */
export async function ensureEffectApplied(
  runId: string,
  actionId: string,
  effectType: DesignEffectType,
  payload: Prisma.InputJsonValue,
  apply: () => Promise<void>,
): Promise<void> {
  const where = { runId_actionId_effectType: { runId, actionId, effectType } }

  const existing = await prisma.designAgentEffect.findUnique({ where })

  if (existing?.status === "applied") {
    return
  }

  if (!existing) {
    await prisma.designAgentEffect.create({
      data: { runId, actionId, effectType, status: "pending", payload },
    })
  }

  await apply()

  await prisma.designAgentEffect.upsert({
    where,
    update: { status: "applied", appliedAt: new Date() },
    create: { runId, actionId, effectType, status: "applied", payload, appliedAt: new Date() },
  })
}
