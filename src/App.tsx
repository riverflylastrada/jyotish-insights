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
import Placeholder from "./pages/app/Placeholder";
import { AuthPage } from "./pages/app/Auth";

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

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="new" element={<NewChart />} />
            <Route path="library" element={<Placeholder title="Your Chart Library" kicker="Library" description="A searchable library of all charts you've cast. Saves require Lovable Cloud, which ships in the next phase." />} />
            <Route path="settings" element={<Placeholder title="Preferences" kicker="Settings" description="Default Ayanamsa, chart style, house system, and language preferences." />} />
            <Route path="chart/:id" element={<ChartDetail />} />
            <Route path="chart/:id/charts" element={<Placeholder title="Divisional Charts" kicker="D1 — D60" />} />
            <Route path="chart/:id/dashas" element={<Placeholder title="Dasha Timelines" kicker="Vimshottari · Yogini · Char" />} />
            <Route path="chart/:id/doshas" element={<Placeholder title="Doshas & Remedies" kicker="Configurations" />} />
            <Route path="chart/:id/yogas" element={<Placeholder title="Yogas Detected" kicker="Raja · Dhana · Pancha Mahapurusha" />} />
            <Route path="chart/:id/ashtakvarga" element={<Placeholder title="Ashtakavarga" kicker="Bhinna & Sarvashtakavarga" />} />
            <Route path="chart/:id/transits" element={<Placeholder title="Current Transits" kicker="Sky vs natal" />} />
            <Route path="chart/:id/debate" element={<Placeholder title="The Guru Debate" kicker="Tribunal" description="Five Gurus, one Acharya. The signature multi-Guru debate engine arrives in the next phase." />} />
            <Route path="chart/:id/report" element={<Placeholder title="Full Report" kicker="Print-ready" description="Long-form, print-optimized PDF report. Ships once the report layout is wired." />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
