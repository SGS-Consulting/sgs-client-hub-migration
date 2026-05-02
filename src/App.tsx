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
import AuthCallback from "./pages/AuthCallback.tsx";
import Intake from "./pages/Intake.tsx";

import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminWorkspaces from "./pages/admin/AdminWorkspaces";
import AdminWorkspaceDetail from "./pages/admin/AdminWorkspaceDetail";
import AdminClients from "./pages/admin/AdminClients";
import AdminClientDetail from "./pages/admin/AdminClientDetail";
import AdminIntake from "./pages/admin/AdminIntake";
import AdminIntakeDetail from "./pages/admin/AdminIntakeDetail";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminQueries from "./pages/admin/AdminQueries";
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
import ClientQueries from "./pages/client/ClientQueries";
import ClientWorkers from "./pages/client/ClientWorkers";
import ClientLegal from "./pages/client/ClientLegal";
import ClientAdvisory from "./pages/client/ClientAdvisory";
import ClientInsurance from "./pages/client/ClientInsurance";
import ClientBranding from "./pages/client/ClientBranding";
import WorkerW9Form from "./pages/WorkerW9Form";
import AdminLegalCases from "./pages/admin/AdminLegalCases";
import AdminAdvisory from "./pages/admin/AdminAdvisory";
import AdminInsurance from "./pages/admin/AdminInsurance";
import AdminBranding from "./pages/admin/AdminBranding";

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
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/intake" element={<Intake />} />
            <Route path="/w9/:token" element={<WorkerW9Form />} />

            {/* Admin (internal team) */}
            <Route path="/admin" element={
              <ProtectedRoute requireArea="internal"><AdminLayout /></ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="tasks" element={
                <ProtectedRoute requireArea="internal" requireCap="view:tasks"><AdminTasks /></ProtectedRoute>
              } />
              <Route path="tasks/workspaces" element={
                <ProtectedRoute requireArea="internal" requireCap="view:workspaces"><AdminWorkspaces /></ProtectedRoute>
              } />
              <Route path="tasks/workspaces/:id" element={
                <ProtectedRoute requireArea="internal" requireCap="view:workspaces"><AdminWorkspaceDetail /></ProtectedRoute>
              } />
              <Route path="clients" element={
                <ProtectedRoute requireArea="internal" requireCap="view:clients"><AdminClients /></ProtectedRoute>
              } />
              <Route path="clients/:id" element={
                <ProtectedRoute requireArea="internal" requireCap="view:clients"><AdminClientDetail /></ProtectedRoute>
              } />
              <Route path="intake" element={
                <ProtectedRoute requireArea="internal" requireCap="view:intake"><AdminIntake /></ProtectedRoute>
              } />
              <Route path="intake/:id" element={
                <ProtectedRoute requireArea="internal" requireCap="view:intake"><AdminIntakeDetail /></ProtectedRoute>
              } />
              <Route path="documents" element={
                <ProtectedRoute requireArea="internal" requireCap="view:documents"><AdminDocuments /></ProtectedRoute>
              } />
              <Route path="invoices" element={
                <ProtectedRoute requireArea="internal" requireCap="view:finance"><AdminInvoices /></ProtectedRoute>
              } />
              <Route path="queries" element={
                <ProtectedRoute requireArea="internal" requireCap="view:queries"><AdminQueries /></ProtectedRoute>
              } />
              <Route path="legal-cases" element={
                <ProtectedRoute requireArea="internal" requireCap="view:legal_cases"><AdminLegalCases /></ProtectedRoute>
              } />
              <Route path="advisory" element={
                <ProtectedRoute requireArea="internal" requireCap="view:advisory"><AdminAdvisory /></ProtectedRoute>
              } />
              <Route path="insurance" element={
                <ProtectedRoute requireArea="internal" requireCap="view:insurance"><AdminInsurance /></ProtectedRoute>
              } />
              <Route path="branding" element={
                <ProtectedRoute requireArea="internal" requireCap="view:branding"><AdminBranding /></ProtectedRoute>
              } />
              <Route path="services" element={
                <ProtectedRoute requireArea="internal" requireCap="manage:services"><AdminServices /></ProtectedRoute>
              } />
              <Route path="team" element={
                <ProtectedRoute requireArea="internal" requireCap="view:team"><AdminTeam /></ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute requireArea="internal" requireCap="view:settings"><AdminSettings /></ProtectedRoute>
              } />
            </Route>

            {/* Client portal */}
            <Route path="/portal" element={
              <ProtectedRoute requireArea="client"><ClientLayout /></ProtectedRoute>
            }>
              <Route index element={<ClientDashboard />} />
              <Route path="profile" element={<ClientProfile />} />
              <Route path="documents" element={<ClientDocuments />} />
              <Route path="invoices" element={<ClientInvoices />} />
              <Route path="services" element={<ClientServices />} />
              <Route path="queries" element={<ClientQueries />} />
              <Route path="workers" element={<ClientWorkers />} />
              <Route path="legal" element={<ClientLegal />} />
              <Route path="advisory" element={<ClientAdvisory />} />
              <Route path="insurance" element={<ClientInsurance />} />
              <Route path="branding" element={<ClientBranding />} />
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
