import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import React from "react";
import Index from "./pages/Index";
import Project from "./pages/Project";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import ShareRequests from "./pages/ShareRequests";
import { UserProvider } from "./contexts/UserContext";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./components/Header";
import ProfilePage from "./pages/ProfilePage";
import VotePage from "./pages/VotePage";

// Wrapper component to handle AnimatePresence with routes
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/project/:projectId" element={<Project />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/share-requests" element={<ShareRequests />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/:username" element={<ProfilePage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

// Create a QueryClient instance outside of the component to avoid React strict mode issues
const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <React.StrictMode>
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Header />
              <AnimatedRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </UserProvider>
      </React.StrictMode>
    </QueryClientProvider>
  );
};

export default App;
