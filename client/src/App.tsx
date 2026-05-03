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
const AdminDashboard         = lazy(() => import("@/modules/admin/pages/AdminDashboard"));
const ClusterManagementPage  = lazy(() => import("@/modules/admin/pages/ClusterManagementPage"));
const BroadcastAlerts        = lazy(() => import("@/modules/admin/pages/BroadcastAlerts"));
const TrustDashboard         = lazy(() => import("@/modules/admin/pages/TrustDashboard"));
const OrganizationsPage      = lazy(() => import("@/modules/admin/pages/OrganizationsPage"));
const DeveloperPlatformPage  = lazy(() => import("@/modules/admin/pages/DeveloperPlatformPage"));
const MonitoringPage         = lazy(() => import("@/modules/admin/pages/MonitoringPage"));
const SimulationPage         = lazy(() => import("@/modules/admin/pages/SimulationPage"));
const DigitalTwinPage        = lazy(() => import("@/modules/admin/pages/DigitalTwinPage"));
const AIOverridePage         = lazy(() => import("@/modules/admin/pages/AIOverridePage"));

// ─── Analytics / AI ──────────────────────────────────────────────────────────
const AnalyticsDashboard   = lazy(() => import("@/modules/analytics/pages/AnalyticsDashboard"));
const ImageClassification  = lazy(() => import("@/modules/analytics/pages/ImageClassification"));
const PredictiveModeling   = lazy(() => import("@/modules/analytics/pages/PredictiveModeling"));
const IntelligenceDashboard= lazy(() => import("@/modules/analytics/pages/IntelligenceDashboard"));
const CrisisCopilot        = lazy(() => import("@/modules/analytics/pages/CrisisCopilot"));
const ExplainabilityPage   = lazy(() => import("@/modules/analytics/pages/ExplainabilityPage"));
const MultimodalPage       = lazy(() => import("@/modules/analytics/pages/MultimodalPage"));

// ─── Map ─────────────────────────────────────────────────────────────────────
const Map     = lazy(() => import("@/modules/map/pages/Map"));
const RiskMap = lazy(() => import("@/modules/map/pages/RiskMap"));

// ─── User / Profile ──────────────────────────────────────────────────────────
const UserProfile            = lazy(() => import("@/modules/user/pages/UserProfile"));
const IdentityVerification   = lazy(() => import("@/modules/user/pages/IdentityVerification"));
const ReputationDashboard    = lazy(() => import("@/modules/user/pages/ReputationDashboard"));
const Notifications          = lazy(() => import("@/modules/user/pages/Notifications"));
const NotificationPreferences= lazy(() => import("@/modules/user/pages/NotificationPreferences"));
const CompliancePage         = lazy(() => import("@/modules/user/pages/CompliancePage"));

// ─── Misc ────────────────────────────────────────────────────────────────────
const ChatPage          = lazy(() => import("@/modules/chat/pages/ChatPage"));
const DecisionEnginePage = lazy(() => import("@/pages/DecisionEnginePage"));
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

        {/* Admin */}
        <Route path="/admin"          component={() => <S><AdminDashboard /></S>} />
        <Route path="/clusters"       component={() => <S><ClusterManagementPage /></S>} />
        <Route path="/broadcast-alerts" component={() => <S><BroadcastAlerts /></S>} />
        <Route path="/trust"          component={() => <S><TrustDashboard /></S>} />
        <Route path="/organizations"  component={() => <S><OrganizationsPage /></S>} />
        <Route path="/developer"      component={() => <S><DeveloperPlatformPage /></S>} />
        <Route path="/monitoring"     component={() => <S><MonitoringPage /></S>} />
        <Route path="/simulation"     component={() => <S><SimulationPage /></S>} />
        <Route path="/digital-twin"   component={() => <S><DigitalTwinPage /></S>} />
        <Route path="/ai-override"    component={() => <S><AIOverridePage /></S>} />

        {/* Analytics / AI */}
        <Route path="/analytics"      component={() => <S><AnalyticsDashboard /></S>} />
        <Route path="/classify"       component={() => <S><ImageClassification /></S>} />
        <Route path="/predictions"    component={() => <S><PredictiveModeling /></S>} />
        <Route path="/intelligence"   component={() => <S><IntelligenceDashboard /></S>} />
        <Route path="/copilot"        component={() => <S><CrisisCopilot /></S>} />
        <Route path="/explainability" component={() => <S><ExplainabilityPage /></S>} />
        <Route path="/multimodal-ai"  component={() => <S><MultimodalPage /></S>} />

        {/* Map */}
        <Route path="/map"      component={() => <S><Map /></S>} />
        <Route path="/risk-map" component={() => <S><RiskMap /></S>} />

        {/* User */}
        <Route path="/profile"                  component={() => <S><UserProfile /></S>} />
        <Route path="/verify"                   component={() => <S><IdentityVerification /></S>} />
        <Route path="/reputation"               component={() => <S><ReputationDashboard /></S>} />
        <Route path="/notifications"            component={() => <S><Notifications /></S>} />
        <Route path="/notification-preferences" component={() => <S><NotificationPreferences /></S>} />
        <Route path="/compliance"               component={() => <S><CompliancePage /></S>} />

        {/* Decision Engine */}
        <Route path="/decision-engine"  component={() => <S><DecisionEnginePage /></S>} />

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
