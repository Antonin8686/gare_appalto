import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";

import { ProtectedRoute } from "./components/ProtectedRoute";

import { AuthProvider } from "./contexts/AuthContext";

import { CompaniesListPage } from "./pages/CompaniesList";
import { CompanyDetailPage } from "./pages/CompanyDetail";
import { CompanyFormPage } from "./pages/CompanyForm";
import { TechnicalOfferDetailPage } from "./pages/TechnicalOfferDetail";
import { TechnicalOfferFormPage } from "./pages/TechnicalOfferForm";
import { TechnicalOffersListPage } from "./pages/TechnicalOffersList";
import { ImportedTendersListPage } from "./pages/ImportedTendersList";
import { ScoutingDashboardPage } from "./pages/ScoutingDashboard";
import { SearchPage } from "./pages/Search";
import { TelematUploadPage } from "./pages/TelematUpload";
import { TendersKanbanPage } from "./pages/TendersKanban";
import { TendersListPage } from "./pages/TendersList";
import { TenderDetailPage } from "./pages/TenderDetail";
import { TenderFormPage } from "./pages/TenderForm";
import { DashboardPage } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { ParticipationPage } from "./pages/ParticipationPage";
import { ProfilePage } from "./pages/Profile";
import { RequirementMatrixPage } from "./pages/RequirementMatrixPage";
import { PermissionRoute } from "./components/PermissionRoute";
import { UserManagementPage } from "./pages/UserManagement";



export function App() {

  return (

    <AuthProvider>

      <BrowserRouter>

        <Routes>

          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>

            <Route element={<AppLayout />}>

              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tenders" element={<TendersListPage />} />
              <Route path="/tenders/board" element={<TendersKanbanPage />} />
              <Route path="/tenders/imported" element={<ImportedTendersListPage />} />
              <Route path="/scouting" element={<ScoutingDashboardPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/imports/telemat" element={<TelematUploadPage />} />
              <Route path="/tenders/new" element={<TenderFormPage />} />
              <Route path="/tenders/:id" element={<TenderDetailPage />} />
              <Route path="/tenders/:id/edit" element={<TenderFormPage />} />
              <Route path="/companies" element={<CompaniesListPage />} />
              <Route path="/companies/new" element={<CompanyFormPage />} />
              <Route path="/companies/:id" element={<CompanyDetailPage />} />
              <Route path="/companies/:id/edit" element={<CompanyFormPage />} />
              <Route path="/technical-offers" element={<TechnicalOffersListPage />} />
              <Route path="/technical-offers/new" element={<TechnicalOfferFormPage />} />
              <Route path="/technical-offers/:id" element={<TechnicalOfferDetailPage />} />
              <Route path="/technical-offers/:id/edit" element={<TechnicalOfferFormPage />} />
              <Route path="/participation" element={<ParticipationPage />} />
              <Route path="/participation/:tenderId" element={<ParticipationPage />} />
              <Route path="/tenders/:tenderId/participation" element={<ParticipationPage />} />
              <Route path="/requirements-matrix" element={<RequirementMatrixPage />} />
              <Route path="/requirements-matrix/:tenderId" element={<RequirementMatrixPage />} />
              <Route path="/tenders/:tenderId/requirements-matrix" element={<RequirementMatrixPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/admin/users"
                element={
                  <PermissionRoute permission="admin.users.view">
                    <UserManagementPage />
                  </PermissionRoute>
                }
              />

            </Route>

          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>

      </BrowserRouter>

    </AuthProvider>

  );

}


