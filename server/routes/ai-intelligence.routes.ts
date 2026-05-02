import type { Express } from "express";
import { isAuthenticated } from "../middleware/jwtAuth";
import { aiRequestLimiter } from "../middleware/rateLimiting";
import { CrisisIntelligenceService } from "../modules/ai/crisis-intelligence.service";
import { RAGKnowledgeService } from "../modules/ai/rag-knowledge.service";
import { storage } from "../db/storage";
import { logger } from "../utils/logger";

export function registerAIIntelligenceRoutes(app: Express) {
  const crisisIntelligence = new CrisisIntelligenceService();
  const ragKnowledge = new RAGKnowledgeService();

  // Multi-signal crisis analysis
  app.post("/api/ai/analyze", isAuthenticated, aiRequestLimiter, async (req: any, res) => {
    try {
      const { text, type, severity, location, latitude, longitude, imageUrls } = req.body;
      const userId = req.user.userId;

      if (!text || !type || !severity || !location) {
        return res.status(400).json({ message: "text, type, severity, location are required" });
      }

      const result = await crisisIntelligence.analyzeMultiSignal({
        text, type, severity, location, latitude, longitude, imageUrls, userId,
      });

      logger.info("Multi-signal analysis requested", {
        userId,
        type,
        urgencyLevel: result.urgencyScore.level,
        auditId: result.explainableDecision.auditId,
      });

      res.json(result);
    } catch (error) {
      logger.error("AI analyze error", error as Error);
      res.status(500).json({ message: "Analysis failed" });
    }
  });

  // Early warning detection
  app.get("/api/ai/early-warning", isAuthenticated, async (req: any, res) => {
    try {
      const reports = await storage.getAllDisasterReports();
      const mapped = reports.map(r => ({
        type: r.type,
        location: r.location,
        latitude: r.latitude,
        longitude: r.longitude,
        createdAt: new Date(r.createdAt),
        severity: r.severity,
      }));

      const warning = await crisisIntelligence.detectEarlyWarning(mapped);
      res.json(warning || { warningDetected: false, message: "No early warning patterns detected" });
    } catch (error) {
      logger.error("Early warning error", error as Error);
      res.status(500).json({ message: "Early warning detection failed" });
    }
  });

  // RAG-based crisis copilot guidance
  app.post("/api/ai/copilot", isAuthenticated, aiRequestLimiter, async (req: any, res) => {
    try {
      const { emergencyType, severity, description, location, language } = req.body;

      if (!emergencyType || !severity || !description || !location) {
        return res.status(400).json({ message: "emergencyType, severity, description, location required" });
      }

      const raw = await ragKnowledge.getContextualGuidance(
        emergencyType, severity, description, location, language || "en"
      );

      const guidance = {
        summary: raw.multiLanguageSupport.english,
        immediateActions: raw.immediateActions,
        medicalGuidance: raw.medicalGuidance,
        evacuationProtocol: raw.safetyInstructions,
        localResources: Object.entries(raw.emergencyNumbers).map(([name, contact]) => ({
          name, contact, notes: "",
        })),
        doNots: [],
        confidence: Math.round(raw.confidence * 100),
        language: language || "en",
        governmentGuidelines: raw.governmentGuidelines.join(" "),
        hindiInstructions: raw.multiLanguageSupport.hindi,
      };

      logger.info("RAG copilot guidance requested", { emergencyType, severity });
      res.json(guidance);
    } catch (error) {
      logger.error("AI copilot error", error as Error);
      res.status(500).json({ message: "Copilot guidance failed" });
    }
  });

  // Get AI explainability for a specific report
  app.get("/api/ai/explain/:reportId", isAuthenticated, async (req: any, res) => {
    try {
      const { reportId } = req.params;
      const report = await storage.getDisasterReport(reportId);
      if (!report) return res.status(404).json({ message: "Report not found" });

      const analysis = await crisisIntelligence.analyzeMultiSignal({
        text: `${report.title} ${report.description}`,
        type: report.type,
        severity: report.severity,
        location: report.location,
        latitude: report.latitude || undefined,
        longitude: report.longitude || undefined,
      });

      res.json({
        reportId,
        explanation: analysis.explainableDecision,
        urgency: analysis.urgencyScore,
        intent: analysis.intentAnalysis,
        fakeDetection: analysis.fakeDetection,
        recommendations: analysis.recommendations,
      });
    } catch (error) {
      logger.error("AI explain error", error as Error);
      res.status(500).json({ message: "Explanation failed" });
    }
  });
}
