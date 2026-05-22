import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import NewChart from "./pages/app/NewChart";
import ChartDetail from "./pages/app/ChartDetail";
import { AuthPage } from "./pages/app/Auth";
import DivisionalCharts from "./pages/app/DivisionalCharts";
import Dashas from "./pages/app/Dashas";
import Doshas from "./pages/app/Doshas";
import Yogas from "./pages/app/Yogas";
import Debate from "./pages/app/Debate";
import Ashtakavarga from "./pages/app/Ashtakavarga";
import Transits from "./pages/app/Transits";
import Report from "./pages/app/Report";
import Remedies from "./pages/app/Remedies";
import Muhurta from "./pages/app/Muhurta";
import Library from "./pages/app/Library";
import Settings from "./pages/app/Settings";
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequireAdmin } from "./components/auth/RequireAdmin";
import { AdminLayout } from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminApiKeys from "./pages/admin/AdminApiKeys";
import AdminLlmConfig from "./pages/admin/AdminLlmConfig";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />

          <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="new" element={<NewChart />} />
            <Route path="library" element={<Library />} />
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
          </Route>

          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="api-keys" element={<AdminApiKeys />} />
            <Route path="llm-config" element={<AdminLlmConfig />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
