import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import SignIn from './pages/SignIn'
import AcceptInvite from './pages/AcceptInvite'
import NotFound from './pages/NotFound'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminSponsors from './pages/admin/AdminSponsors'
import AdminSponsorDetail from './pages/admin/AdminSponsorDetail'
import AdminMembers from './pages/admin/AdminMembers'
import AdminMemberDetail from './pages/admin/AdminMemberDetail'
import SponsorDashboard from './pages/sponsor/SponsorDashboard'
import SponsorMembers from './pages/sponsor/SponsorMembers'
import MemberForm from './pages/sponsor/MemberForm'
import TeamTree from './pages/sponsor/TeamTree'
import SponsorTrainings from './pages/sponsor/SponsorTrainings'
import TrainingForm from './pages/sponsor/TrainingForm'
import AdminTrainings from './pages/admin/AdminTrainings'
import SponsorAssessments from './pages/sponsor/SponsorAssessments'
import AssessmentForm from './pages/sponsor/AssessmentForm'
import WeeklyTasks from './pages/sponsor/WeeklyTasks'
import AdminAssessments from './pages/admin/AdminAssessments'
import AdminAssessmentDetail from './pages/admin/AdminAssessmentDetail'
import AdminOrgTree from './pages/admin/AdminOrgTree'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/accept-invite/:token" element={<AcceptInvite />} />

          {/* Sponsor routes */}
          <Route element={<ProtectedRoute requireRole="sponsor" />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<SponsorDashboard />} />
              <Route path="/members" element={<SponsorMembers />} />
              <Route path="/members/new" element={<MemberForm />} />
              <Route path="/members/:id" element={<MemberForm />} />
              <Route path="/team-tree" element={<TeamTree />} />
              <Route path="/trainings" element={<SponsorTrainings />} />
              <Route path="/trainings/new" element={<TrainingForm />} />
              <Route path="/trainings/:id" element={<TrainingForm />} />
              <Route path="/assessments" element={<SponsorAssessments />} />
              <Route path="/assessments/:month" element={<AssessmentForm />} />
              <Route path="/weekly-tasks" element={<WeeklyTasks />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute requireRole="admin" />}>
            <Route element={<AppShell />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/sponsors" element={<AdminSponsors />} />
              <Route path="/admin/sponsors/:id" element={<AdminSponsorDetail />} />
              <Route path="/admin/org" element={<AdminOrgTree />} />
              <Route path="/admin/members" element={<AdminMembers />} />
              <Route path="/admin/members/:id" element={<AdminMemberDetail />} />
              <Route path="/admin/trainings" element={<AdminTrainings />} />
              <Route
                path="/admin/assessments"
                element={<AdminAssessments />}
              />
              <Route
                path="/admin/assessments/:sponsorId/:month"
                element={<AdminAssessmentDetail />}
              />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/sign-in" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
