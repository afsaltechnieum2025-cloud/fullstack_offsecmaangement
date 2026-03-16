import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Findings from "./pages/Findings";
import KnowledgeBase from "./pages/KnowledgeBase";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";
import Trending from "./pages/trending";
import ASM from "./pages/asm";
import LLM from "./pages/llm";
import Checklist from "./pages/checklist";
import ContentCreationChecklist from "./pages/checklist";
import ContentCreation from "./pages/checklist";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="/findings" element={<ProtectedRoute><Findings /></ProtectedRoute>} />
            <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
            <Route path="/Content-Creation" element={<ProtectedRoute><ContentCreation /></ProtectedRoute>} />
            <Route path="/trending" element={<ProtectedRoute><Trending /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/asm" element={<ProtectedRoute><ASM /></ProtectedRoute>} />
            <Route path="/llm" element={<ProtectedRoute><LLM /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;