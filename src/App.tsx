import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import QRVerification from "./pages/QRVerification";
import NotFound from "./pages/NotFound";
import { useSpanishValidation } from "@/hooks/use-spanish-validation";
import { useActivityTracker } from "@/hooks/use-activity-tracker";

const queryClient = new QueryClient();

const App = () => {
  // Apply Spanish validation globally
  useSpanishValidation();
  
  // Initialize activity tracking
  useActivityTracker({
    enabled: true,
    batchSize: 10,
    flushInterval: 30000,
    trackPageViews: true,
    trackUserInteractions: true
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/verificar" element={<QRVerification />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
