import type { Express } from "express";
import { isAuthenticated } from "../middleware/jwtAuth";
import { aiRequestLimiter } from "../middleware/rateLimiting";
import { CrisisIntelligenceService } from "../modules/ai/crisis-intelligence.service";
import { RAGKnowledgeService } from "../modules/ai/rag-knowledge.service";
import { SignalFusionService } from "../modules/ai/signal-fusion.service";
import { storage } from "../db/storage";
import { logger } from "../utils/logger";

export function registerAIIntelligenceRoutes(app: Express) {
  const crisisIntelligence = new CrisisIntelligenceService();
  const ragKnowledge = new RAGKnowledgeService();
  const signalFusion = new SignalFusionService();

  // Multi-signal crisis analysis — with Signal Fusion Engine
  app.post("/api/ai/analyze", isAuthenticated, aiRequestLimiter, async (req: any, res) => {
    try {
      const { text, type, severity, location, latitude, longitude, imageUrls } = req.body;
      const userId = req.user.userId;

      if (!text || !type || !severity || !location) {
        return res.status(400).json({ message: "text, type, severity, location are required" });
      }

      // Step 1: Multi-signal AI analysis
      const aiResult = await crisisIntelligence.analyzeMultiSignal({
        text, type, severity, location, latitude, longitude, imageUrls, userId,
      });

      // Step 2: Signal Fusion — combines AI + location risk + repetition + user trust
      const fusedScore = await signalFusion.computeFusedScore(aiResult, {
        latitude, longitude, userId, type,
      });

      logger.info("Multi-signal + fusion analysis completed", {
        userId,
        type,
        urgencyLevel: aiResult.urgencyScore.level,
        fusedPriority: fusedScore.priority,
        finalScore: fusedScore.finalScore,
        auditId: aiResult.explainableDecision.auditId,
      });

      res.json({ ...aiResult, fusedScore });
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

  // RAG-based crisis copilot — structured {steps, warnings, resources} output
  app.post("/api/ai/copilot", isAuthenticated, aiRequestLimiter, async (req: any, res) => {
    try {
      const { emergencyType, severity, description, location, language } = req.body;

      if (!emergencyType || !severity || !description || !location) {
        return res.status(400).json({ message: "emergencyType, severity, description, location required" });
      }

      const raw = await ragKnowledge.getContextualGuidance(
        emergencyType, severity, description, location, language || "en"
      );

      // Spec output: { steps, warnings, resources }
      const steps = [
        ...raw.immediateActions,
        ...raw.safetyInstructions,
      ].filter(Boolean);

      const warnings = [
        ...raw.medicalGuidance.filter(m =>
          /do not|avoid|never|warning|danger|risk/i.test(m)
        ),
        ...raw.governmentGuidelines.filter(g =>
          /mandatory|report|required|must/i.test(g)
        ),
      ];

      const resources = Object.entries(raw.emergencyNumbers).map(([name, contact]) => ({
        name,
        contact,
        notes: "",
      }));

      const guidance = {
        // Spec canonical shape
        steps,
        warnings: warnings.length > 0
          ? warnings
          : ["Stay calm and follow official instructions", "Do NOT return to danger zone until cleared"],
        resources,

        // Extended fields for the Copilot UI
        summary: raw.multiLanguageSupport.english,
        immediateActions: raw.immediateActions,
        medicalGuidance: raw.medicalGuidance,
        evacuationProtocol: raw.safetyInstructions,
        localResources: resources,
        doNots: raw.medicalGuidance.filter(m => /do not|avoid|never/i.test(m)),
        confidence: Math.round(raw.confidence * 100),
        language: language || "en",
        governmentGuidelines: raw.governmentGuidelines.join(" "),
        hindiInstructions: raw.multiLanguageSupport.hindi,
        sources: raw.sources,
        protocol: raw.protocol,
      };

      logger.info("RAG copilot guidance requested", { emergencyType, severity });
      res.json(guidance);
    } catch (error) {
      logger.error("AI copilot error", error as Error);
      res.status(500).json({ message: "Copilot guidance failed" });
    }
  });

  // Explainability for a specific report — now also includes fused score
  app.get("/api/ai/explain/:reportId", isAuthenticated, async (req: any, res) => {
    try {
      const { reportId } = req.params;
      const report = await storage.getDisasterReport(reportId);
      if (!report) return res.status(404).json({ message: "Report not found" });

      const [analysis, fusedScore] = await Promise.all([
        crisisIntelligence.analyzeMultiSignal({
          text: `${report.title} ${report.description}`,
          type: report.type,
          severity: report.severity,
          location: report.location,
          latitude: report.latitude || undefined,
          longitude: report.longitude || undefined,
        }),
        signalFusion.computeFusedScore(
          // minimal placeholder for fusion without full analysis
          {
            urgencyScore: { score: 5, level: "moderate", factors: [] },
            emotionAnalysis: { dominantEmotion: "neutral", intensity: 0.5, isDistressed: false },
            intentAnalysis: { isGenuineEmergency: true, isCasualMention: false, isTestReport: false, confidence: 0.7 },
            crisisClassification: { type: report.type, subtype: "general", confidence: 0.7 },
            fakeDetection: { score: 10, isSuspicious: false, reasons: [] },
            explainableDecision: { triggered: true, confidence: 0.7, contributingFactors: [], reasoning: "", auditId: "", timestamp: "", modelVersion: "" },
            recommendations: [],
            rawScore: 50,
          },
          { latitude: report.latitude || undefined, longitude: report.longitude || undefined, type: report.type }
        ),
      ]);

      res.json({
        reportId,
        explanation: analysis.explainableDecision,
        urgency: analysis.urgencyScore,
        intent: analysis.intentAnalysis,
        fakeDetection: analysis.fakeDetection,
        fusedScore,
        recommendations: analysis.recommendations,
      });
    } catch (error) {
      logger.error("AI explain error", error as Error);
      res.status(500).json({ message: "Explanation failed" });
    }
  });
}
