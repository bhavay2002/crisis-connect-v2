import type { Express } from "express";
import { db } from "../db/db";
import { disasterReports } from "@shared/schema";
import { ne, inArray, desc, and } from "drizzle-orm";
import { authenticateToken } from "../middleware/jwtAuth";
import { logger } from "../utils/logger";

function buildRecommendedActions(report: typeof disasterReports.$inferSelect) {
  const actions: Array<{ id: string; label: string; type: "primary" | "secondary" | "danger"; confidence: number; url: string }> = [];

  if (report.severity === "critical" || report.severity === "high") {
    actions.push({
      id: "dispatch",
      label: "Dispatch responders",
      type: "primary",
      confidence: report.aiValidationScore ? report.aiValidationScore / 100 : 0.85,
      url: `/map`,
    });
  }

  actions.push({
    id: "broadcast",
    label: "Broadcast alert",
    type: "secondary",
    confidence: 0.9,
    url: `/broadcast-alerts`,
  });

  actions.push({
    id: "view",
    label: "View full report",
    type: "secondary",
    confidence: 1,
    url: `/reports/${report.id}`,
  });

  if (["ngo", "admin", "authority", "super_admin"].includes("admin")) {
    actions.push({
      id: "override",
      label: "AI override",
      type: "danger",
      confidence: 0.7,
      url: `/ai-override`,
    });
  }

  return actions;
}

export function registerDecisionRoutes(app: Express) {
  app.get("/api/decisions/active", authenticateToken, async (req, res) => {
    try {
      const criticalReports = await db
        .select()
        .from(disasterReports)
        .where(
          and(
            ne(disasterReports.status, "resolved"),
            inArray(disasterReports.severity, ["critical", "high"])
          )
        )
        .orderBy(desc(disasterReports.createdAt))
        .limit(5);

      const decisions = criticalReports.map((r) => {
        const rawScore = r.aiValidationScore ?? null;
        const severityWeight = r.severity === "critical" ? 0.95 : 0.75;
        const normalizedSeverity = rawScore !== null ? rawScore / 100 : severityWeight;

        return {
          incidentId: r.id,
          title: r.title,
          type: r.type,
          severity: Math.round(normalizedSeverity * 100) / 100,
          priority: r.severity === "critical" ? "CRITICAL" : "HIGH",
          location: r.location,
          status: r.status,
          fakeDetectionScore: r.fakeDetectionScore,
          aiValidationScore: r.aiValidationScore,
          createdAt: r.createdAt,
          recommendedActions: buildRecommendedActions(r),
        };
      });

      res.json({ decisions, count: decisions.length });
    } catch (error) {
      logger.error("Failed to fetch active decisions", error as Error);
      res.status(500).json({ message: "Failed to fetch active decisions" });
    }
  });
}
