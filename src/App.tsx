import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthPage } from "./pages/app/Auth";
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequireAdmin } from "./components/auth/RequireAdmin";
import { AdminLayout } from "./components/layout/AdminLayout";

// Route pages are code-split so the initial load only ships the shell + landing.
// Each page becomes its own chunk, fetched on navigation.
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const NewChart = lazy(() => import("./pages/app/NewChart"));
const ChartDetail = lazy(() => import("./pages/app/ChartDetail"));
const DivisionalCharts = lazy(() => import("./pages/app/DivisionalCharts"));
const Dashas = lazy(() => import("./pages/app/Dashas"));
const Doshas = lazy(() => import("./pages/app/Doshas"));
const Yogas = lazy(() => import("./pages/app/Yogas"));
const Debate = lazy(() => import("./pages/app/Debate"));
const Ashtakavarga = lazy(() => import("./pages/app/Ashtakavarga"));
const Transits = lazy(() => import("./pages/app/Transits"));
const Report = lazy(() => import("./pages/app/Report"));
const Remedies = lazy(() => import("./pages/app/Remedies"));
const Muhurta = lazy(() => import("./pages/app/Muhurta"));
const Library = lazy(() => import("./pages/app/Library"));
const Compatibility = lazy(() => import("./pages/app/Compatibility"));
const Settings = lazy(() => import("./pages/app/Settings"));
const Strengths = lazy(() => import("./pages/app/Strengths"));
const Kp = lazy(() => import("./pages/app/Kp"));
const Jaimini = lazy(() => import("./pages/app/Jaimini"));
const Varshphal = lazy(() => import("./pages/app/Varshphal"));
const ResearchLab = lazy(() => import("./pages/app/ResearchLab"));
const Prashna = lazy(() => import("./pages/app/Prashna"));
const BusinessNew = lazy(() => import("./pages/app/BusinessNew"));
const TwinsNew = lazy(() => import("./pages/app/TwinsNew"));
const TwinsCompare = lazy(() => import("./pages/app/TwinsCompare"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminApiKeys = lazy(() => import("./pages/admin/AdminApiKeys"));
const AdminLlmConfig = lazy(() => import("./pages/admin/AdminLlmConfig"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false } },
});

const PageFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-brand-saffron" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />

            <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="new" element={<NewChart />} />
              <Route path="library" element={<Library />} />
              <Route path="compatibility" element={<Compatibility />} />
              <Route path="settings" element={<Settings />} />
              <Route path="chart/:id" element={<ChartDetail />} />
              <Route path="chart/:id/charts" element={<DivisionalCharts />} />
              <Route path="chart/:id/dashas" element={<Dashas />} />
              <Route path="chart/:id/doshas" element={<Doshas />} />
              <Route path="chart/:id/yogas" element={<Yogas />} />
              <Route path="chart/:id/ashtakvarga" element={<Ashtakavarga />} />
              <Route path="chart/:id/ashtakavarga" element={<Ashtakavarga />} />
              <Route path="chart/:id/transits" element={<Transits />} />
              <Route path="chart/:id/debate" element={<Debate />} />
              <Route path="chart/:id/report" element={<Report />} />
              <Route path="chart/:id/remedies" element={<Remedies />} />
              <Route path="chart/:id/muhurta" element={<Muhurta />} />
              <Route path="chart/:id/strengths" element={<Strengths />} />
              <Route path="chart/:id/kp" element={<Kp />} />
              <Route path="chart/:id/jaimini" element={<Jaimini />} />
              <Route path="chart/:id/varshphal" element={<Varshphal />} />
              <Route path="chart/:id/lab" element={<ResearchLab />} />
              <Route path="prashna" element={<Prashna />} />
              <Route path="business/new" element={<BusinessNew />} />
              <Route path="twins/new" element={<TwinsNew />} />
              <Route path="twins/:idA/:idB" element={<TwinsCompare />} />
            </Route>

            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="api-keys" element={<AdminApiKeys />} />
              <Route path="llm-config" element={<AdminLlmConfig />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
