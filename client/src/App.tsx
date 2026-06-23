import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { LowBandwidthProvider } from "@/context/LowBandwidthContext";
import { OfflineSyncProvider } from "@/context/OfflineSyncContext";
import { WebSocketProvider } from "@/providers/WebSocketProvider";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import DashboardLayout from "@/components/layout/DashboardLayout";

// ─── Auth / public pages (small, load eagerly) ───────────────────────────────
import Landing from "@/modules/auth/pages/Landing";
const Login           = lazy(() => import("@/modules/auth/pages/Login"));
const Register        = lazy(() => import("@/modules/auth/pages/Register"));
const RoleSelection   = lazy(() => import("@/modules/auth/pages/RoleSelection"));

// ─── Reports ─────────────────────────────────────────────────────────────────
const Dashboard       = lazy(() => import("@/modules/reports/pages/Dashboard"));
const ActiveReports   = lazy(() => import("@/modules/reports/pages/ActiveReports"));
const ReportDetails   = lazy(() => import("@/modules/reports/pages/ReportDetails"));
const SubmitReport    = lazy(() => import("@/modules/reports/pages/SubmitReport"));
const MyReports       = lazy(() => import("@/modules/reports/pages/MyReports"));
const ResponseTeams   = lazy(() => import("@/modules/reports/pages/ResponseTeams"));

// ─── Resources ───────────────────────────────────────────────────────────────
const ResourceRequests       = lazy(() => import("@/modules/resources/pages/ResourceRequests"));
const ResourceManagement     = lazy(() => import("@/modules/resources/pages/ResourceManagement"));
const SubmitResourceRequest  = lazy(() => import("@/modules/resources/pages/SubmitResourceRequest"));

// ─── Aid / Matching ───────────────────────────────────────────────────────────
const AidOffers          = lazy(() => import("@/modules/aid/pages/AidOffers"));
const SubmitAidOffer     = lazy(() => import("@/modules/aid/pages/SubmitAidOffer"));
const AidOfferMatches    = lazy(() => import("@/modules/aid/pages/AidOfferMatches"));
const AidMatchingDashboard = lazy(() => import("@/modules/aid/pages/AidMatchingDashboard"));
const VolunteerDashboard = lazy(() => import("@/modules/aid/pages/VolunteerDashboard"));
const MatchingEngine     = lazy(() => import("@/modules/aid/pages/MatchingEngine"));

// ─── Admin ───────────────────────────────────────────────────────────────────
const AdminConsolePage       = lazy(() => import("@/modules/admin/pages/AdminConsolePage"));
const ClusterManagementPage  = lazy(() => import("@/modules/admin/pages/ClusterManagementPage"));
const BroadcastAlerts        = lazy(() => import("@/modules/admin/pages/BroadcastAlerts"));
const DeveloperPlatformPage  = lazy(() => import("@/modules/admin/pages/DeveloperPlatformPage"));
const MonitoringPage         = lazy(() => import("@/modules/admin/pages/MonitoringPage"));
const DigitalTwinPage        = lazy(() => import("@/modules/admin/pages/DigitalTwinPage"));
const AIOverridePage         = lazy(() => import("@/modules/admin/pages/AIOverridePage"));
const AIControlCenter        = lazy(() => import("@/pages/AIControlCenter"));

// ─── Analytics / AI ──────────────────────────────────────────────────────────
const IntelligenceCenter   = lazy(() => import("@/modules/analytics/pages/IntelligenceCenter"));
const ImageClassification  = lazy(() => import("@/modules/analytics/pages/ImageClassification"));
const PredictiveModeling   = lazy(() => import("@/modules/analytics/pages/PredictiveModeling"));
const CrisisCopilot        = lazy(() => import("@/modules/analytics/pages/CrisisCopilot"));
const ExplainabilityPage   = lazy(() => import("@/modules/analytics/pages/ExplainabilityPage"));
const MultimodalPage       = lazy(() => import("@/modules/analytics/pages/MultimodalPage"));

// ─── Map ─────────────────────────────────────────────────────────────────────
const Map     = lazy(() => import("@/modules/map/pages/Map"));
const RiskMap = lazy(() => import("@/modules/map/pages/RiskMap"));

// ─── User / Profile ──────────────────────────────────────────────────────────
const ProfilePage            = lazy(() => import("@/modules/user/pages/ProfilePage"));
const Notifications          = lazy(() => import("@/modules/user/pages/Notifications"));
const NotificationPreferences= lazy(() => import("@/modules/user/pages/NotificationPreferences"));

// ─── Misc ────────────────────────────────────────────────────────────────────
const ChatPage          = lazy(() => import("@/modules/chat/pages/ChatPage"));
const DecisionEnginePage   = lazy(() => import("@/pages/DecisionEnginePage"));
const GovernanceDashboard  = lazy(() => import("@/pages/GovernanceDashboard"));
const PolicyEnginePage     = lazy(() => import("@/pages/PolicyEnginePage"));
const DataFusionPage       = lazy(() => import("@/pages/DataFusionPage"));
const ExecutiveDashboardPage = lazy(() => import("@/pages/ExecutiveDashboardPage")); // kept for deep-links
const GovernanceAdminPage    = lazy(() => import("@/pages/GovernanceAdminPage"));
const UsageAnalyticsPage     = lazy(() => import("@/pages/UsageAnalyticsPage"));
const AsyncPipelinePage      = lazy(() => import("@/pages/AsyncPipelinePage"));
const AdaptiveFusionPage     = lazy(() => import("@/pages/AdaptiveFusionPage"));
const DevPortalPage          = lazy(() => import("@/pages/DevPortalPage"));
const CommandConsolePage     = lazy(() => import("@/pages/CommandConsolePage"));
const NotFound          = lazy(() => import("@/pages/not-found"));

// ─── Suspense wrapper ────────────────────────────────────────────────────────

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

// ─── Router ──────────────────────────────────────────────────────────────────

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Loading CrisisConnect…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login"    component={() => <S><Login /></S>} />
        <Route path="/register" component={() => <S><Register /></S>} />
        <Route path="/:rest*"   component={Landing} />
      </Switch>
    );
  }

  return (
    <WebSocketProvider>
      <DashboardLayout>
      <Switch>
        {/* Dashboard */}
        <Route path="/"         component={() => <S><Dashboard /></S>} />
        <Route path="/dashboard" component={() => <S><Dashboard /></S>} />

        {/* Reports */}
        <Route path="/reports"        component={() => <S><ActiveReports /></S>} />
        <Route path="/reports/:id"    component={() => <S><ReportDetails /></S>} />
        <Route path="/submit"         component={() => <S><SubmitReport /></S>} />
        <Route path="/my-reports"     component={() => <S><MyReports /></S>} />
        <Route path="/teams"          component={() => <S><ResponseTeams /></S>} />

        {/* Resources */}
        <Route path="/resource-requests"      component={() => <S><ResourceRequests /></S>} />
        <Route path="/submit-resource-request" component={() => <S><SubmitResourceRequest /></S>} />
        <Route path="/resource-management"    component={() => <S><ResourceManagement /></S>} />

        {/* Aid / Matching */}
        <Route path="/volunteer"                    component={() => <S><VolunteerDashboard /></S>} />
        <Route path="/aid-offers"                   component={() => <S><AidOffers /></S>} />
        <Route path="/submit-aid-offer"             component={() => <S><SubmitAidOffer /></S>} />
        <Route path="/aid-offers/:offerId/matches"  component={() => <S><AidOfferMatches /></S>} />
        <Route path="/aid-matching"                 component={() => <S><AidMatchingDashboard /></S>} />
        <Route path="/matching-engine"              component={() => <S><MatchingEngine /></S>} />

        {/* Admin — unified console */}
        <Route path="/admin"          component={() => <S><AdminConsolePage /></S>} />
        <Route path="/clusters"       component={() => <S><ClusterManagementPage /></S>} />
        <Route path="/broadcast-alerts" component={() => <S><BroadcastAlerts /></S>} />
        <Route path="/developer"      component={() => <S><DeveloperPlatformPage /></S>} />
        {/* Merged-into-/admin redirects */}
        <Route path="/trust"          component={() => { window.location.replace("/admin?tab=fraud");    return null; }} />
        <Route path="/organizations"  component={() => { window.location.replace("/admin?tab=organizations"); return null; }} />
        <Route path="/platform-settings" component={() => { window.location.replace("/admin?tab=settings"); return null; }} />
        <Route path="/monitoring"     component={() => <S><MonitoringPage /></S>} />
        <Route path="/digital-twin"   component={() => <S><DigitalTwinPage /></S>} />
        <Route path="/ai-override"       component={() => <S><AIOverridePage /></S>} />
        <Route path="/ai-control-center" component={() => <S><AIControlCenter /></S>} />
        <Route path="/ai-governance"  component={() => <S><AIControlCenter /></S>} />
        <Route path="/governance"     component={() => <S><AIControlCenter /></S>} />
        <Route path="/explainability" component={() => <S><AIControlCenter /></S>} />

        {/* Analytics / AI — unified Intelligence Center */}
        <Route path="/intelligence"   component={() => <S><IntelligenceCenter /></S>} />
        <Route path="/analytics"      component={() => <S><IntelligenceCenter /></S>} />
        <Route path="/classify"       component={() => <S><ImageClassification /></S>} />
        <Route path="/predictions"    component={() => <S><PredictiveModeling /></S>} />
        <Route path="/copilot"        component={() => <S><CrisisCopilot /></S>} />
        <Route path="/explainability" component={() => <S><ExplainabilityPage /></S>} />
        <Route path="/multimodal-ai"  component={() => <S><MultimodalPage /></S>} />

        {/* Map */}
        <Route path="/map"      component={() => <S><Map /></S>} />
        <Route path="/risk-map" component={() => <S><RiskMap /></S>} />

        {/* User */}
        <Route path="/profile"                  component={() => <S><ProfilePage /></S>} />
        <Route path="/verify"                   component={() => { window.location.replace("/profile?tab=verification"); return null; }} />
        <Route path="/reputation"               component={() => { window.location.replace("/profile?tab=reputation"); return null; }} />
        <Route path="/compliance"               component={() => { window.location.replace("/profile?tab=privacy"); return null; }} />
        <Route path="/notifications"            component={() => <S><Notifications /></S>} />
        <Route path="/notification-preferences" component={() => <S><NotificationPreferences /></S>} />

        {/* Decision Engine + Orchestration */}
        <Route path="/decision-engine"  component={() => <S><DecisionEnginePage /></S>} />
        <Route path="/policy-engine"    component={() => <S><AIControlCenter /></S>} />
        <Route path="/data-fusion"      component={() => <S><DataFusionPage /></S>} />

        {/* Reliability + Executive + Platform */}
        <Route path="/executive"        component={() => <S><IntelligenceCenter /></S>} />
        <Route path="/data-governance"  component={() => { window.location.replace("/admin?tab=governance"); return null; }} />
        <Route path="/api-analytics"    component={() => <S><UsageAnalyticsPage /></S>} />
        <Route path="/async-pipeline"   component={() => <S><AsyncPipelinePage /></S>} />
        <Route path="/adaptive-fusion"  component={() => <S><AIControlCenter /></S>} />
        <Route path="/dev-portal"         component={() => <S><DevPortalPage /></S>} />
        <Route path="/command-console"  component={() => <S><CommandConsolePage /></S>} />

        {/* Misc */}
        <Route path="/chat"             component={() => <S><ChatPage /></S>} />
        <Route path="/select-role"      component={() => <S><RoleSelection /></S>} />
        <Route path="/role-selection"   component={() => <S><RoleSelection /></S>} />

        <Route component={() => <S><NotFound /></S>} />
      </Switch>
      </DashboardLayout>
    </WebSocketProvider>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LowBandwidthProvider>
          <OfflineSyncProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
            </TooltipProvider>
          </OfflineSyncProvider>
        </LowBandwidthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
