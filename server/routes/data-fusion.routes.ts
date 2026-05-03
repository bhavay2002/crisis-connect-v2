import type { Express } from "express";
import { isAuthenticated } from "../middleware/jwtAuth";
import { getLiveFusionSignals, analyzeReportFusion, getFusionStats } from "../modules/fusion/data-fusion.service";
import { logger } from "../utils/logger";

export function registerDataFusionRoutes(app: Express) {
  app.get("/api/fusion/signals", isAuthenticated, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const results = await getLiveFusionSignals(limit);
      res.json({ results, count: results.length, generatedAt: new Date().toISOString() });
    } catch (err) {
      logger.error("Fusion signals failed", err instanceof Error ? err : undefined);
      res.status(500).json({ message: "Failed to fetch fusion signals" });
    }
  });

  app.get("/api/fusion/stats", isAuthenticated, async (_req, res) => {
    try {
      const stats = await getFusionStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch fusion stats" });
    }
  });

  app.get("/api/fusion/analyze/:reportId", isAuthenticated, async (req, res) => {
    try {
      const result = await analyzeReportFusion(req.params.reportId);
      if (!result) return res.status(404).json({ message: "Report not found" });
      res.json(result);
    } catch (err) {
      logger.error("Fusion analysis failed", err instanceof Error ? err : undefined);
      res.status(500).json({ message: "Fusion analysis failed" });
    }
  });
}
