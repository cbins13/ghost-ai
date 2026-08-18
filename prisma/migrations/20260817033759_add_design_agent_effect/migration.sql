-- CreateTable
CREATE TABLE "DesignAgentEffect" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "effectType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "DesignAgentEffect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesignAgentEffect_runId_idx" ON "DesignAgentEffect"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignAgentEffect_runId_actionId_effectType_key" ON "DesignAgentEffect"("runId", "actionId", "effectType");
