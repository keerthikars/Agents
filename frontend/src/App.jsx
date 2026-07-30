import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Layouts
import MechanicLayout from './layouts/MechanicLayout'
import CustomerLayout from './layouts/CustomerLayout'

// Auth / Landing pages
import LandingPage   from './pages/LandingPage'
import MechanicLogin from './pages/MechanicLogin'
import CustomerLogin from './pages/CustomerLogin'

// Mechanic pages
import MDashboard       from './pages/mechanic/MDashboard'
import MDiagnosis       from './pages/mechanic/MDiagnosis'
import MInventory       from './pages/mechanic/MInventory'
import MRepair          from './pages/mechanic/MRepair'
import MPayment         from './pages/mechanic/MPayment'
import MChat            from './pages/mechanic/MChat'
import MHistory         from './pages/mechanic/MHistory'
import MAnalytics       from './pages/mechanic/MAnalytics'
import MAppointments    from './pages/mechanic/MAppointments'
import MServiceRequests from './pages/mechanic/MIntake'
import WorkflowDetail   from './pages/WorkflowDetail'

// Customer pages
import CDashboard     from './pages/customer/CDashboard'
import CBookService   from './pages/customer/CBookService'
import CAppointments  from './pages/customer/CAppointments'
import CTrack         from './pages/customer/CTrack'
import CBilling       from './pages/customer/CBilling'
import CNotifications from './pages/customer/CNotifications'
import CProfile       from './pages/customer/CProfile'
import CChat          from './pages/customer/CChat'

const TOAST_OPTS = {
  duration: 3500,
  style: { background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 13, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' },
  success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
  error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={TOAST_OPTS} />
      <Routes>
        {/* ── Public pages ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/mechanic/login" element={<MechanicLogin />} />
        <Route path="/customer/login" element={<CustomerLogin />} />

        {/* ══════════════════════════════════════════
            MECHANIC PORTAL  /mechanic/*
        ══════════════════════════════════════════ */}
        <Route path="/mechanic"                  element={<MechanicLayout><MDashboard /></MechanicLayout>} />
        <Route path="/mechanic/service-requests" element={<MechanicLayout><MServiceRequests /></MechanicLayout>} />
        <Route path="/mechanic/appointments"     element={<MechanicLayout><MAppointments /></MechanicLayout>} />
        <Route path="/mechanic/diagnosis"        element={<MechanicLayout><MDiagnosis /></MechanicLayout>} />
        <Route path="/mechanic/inventory"        element={<MechanicLayout><MInventory /></MechanicLayout>} />
        <Route path="/mechanic/repair"           element={<MechanicLayout><MRepair /></MechanicLayout>} />
        <Route path="/mechanic/payment"          element={<MechanicLayout><MPayment /></MechanicLayout>} />
        <Route path="/mechanic/messages"         element={<MechanicLayout><MChat /></MechanicLayout>} />
        <Route path="/mechanic/history"          element={<MechanicLayout><MHistory /></MechanicLayout>} />
        <Route path="/mechanic/history/:id"      element={<MechanicLayout><WorkflowDetail /></MechanicLayout>} />
        <Route path="/mechanic/analytics"        element={<MechanicLayout><MAnalytics /></MechanicLayout>} />

        {/* ══════════════════════════════════════════
            CUSTOMER PORTAL  /customer/portal/*
            Auth-guarded by CustomerLayout
        ══════════════════════════════════════════ */}
        <Route path="/customer/portal"               element={<CustomerLayout><CDashboard /></CustomerLayout>} />
        <Route path="/customer/portal/book-service"  element={<CustomerLayout><CBookService /></CustomerLayout>} />
        <Route path="/customer/portal/appointments"  element={<CustomerLayout><CAppointments /></CustomerLayout>} />
        <Route path="/customer/portal/track"         element={<CustomerLayout><CTrack /></CustomerLayout>} />
        <Route path="/customer/portal/billing"       element={<CustomerLayout><CBilling /></CustomerLayout>} />
        <Route path="/customer/portal/notifications" element={<CustomerLayout><CNotifications /></CustomerLayout>} />
        <Route path="/customer/portal/chat"          element={<CustomerLayout><CChat /></CustomerLayout>} />
        <Route path="/customer/portal/profile"       element={<CustomerLayout><CProfile /></CustomerLayout>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
