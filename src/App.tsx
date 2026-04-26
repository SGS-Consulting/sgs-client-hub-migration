import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";

import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminWorkspaces from "./pages/admin/AdminWorkspaces";
import AdminWorkspaceDetail from "./pages/admin/AdminWorkspaceDetail";
import AdminClients from "./pages/admin/AdminClients";
import AdminClientDetail from "./pages/admin/AdminClientDetail";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminServices from "./pages/admin/AdminServices";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminSettings from "./pages/admin/AdminSettings";

import { ClientLayout } from "@/components/client/ClientLayout";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientProfile from "./pages/client/ClientProfile";
import ClientDocuments from "./pages/client/ClientDocuments";
import ClientInvoices from "./pages/client/ClientInvoices";
import ClientServices from "./pages/client/ClientServices";
import ClientSupport from "./pages/client/ClientSupport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Admin */}
            <Route path="/admin" element={
              <ProtectedRoute requireRole="admin"><AdminLayout /></ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="tasks" element={<AdminTasks />} />
              <Route path="tasks/workspaces" element={<AdminWorkspaces />} />
              <Route path="tasks/workspaces/:id" element={<AdminWorkspaceDetail />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="clients/:id" element={<AdminClientDetail />} />
              <Route path="documents" element={<AdminDocuments />} />
              <Route path="invoices" element={<AdminInvoices />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="team" element={<AdminTeam />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Client portal */}
            <Route path="/portal" element={
              <ProtectedRoute requireRole="client"><ClientLayout /></ProtectedRoute>
            }>
              <Route index element={<ClientDashboard />} />
              <Route path="profile" element={<ClientProfile />} />
              <Route path="documents" element={<ClientDocuments />} />
              <Route path="invoices" element={<ClientInvoices />} />
              <Route path="services" element={<ClientServices />} />
              <Route path="support" element={<ClientSupport />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
