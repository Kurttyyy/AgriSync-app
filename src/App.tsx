import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import './App.css'
import { AppShell } from './components/layout'
import InstallAppPrompt from './components/InstallAppPrompt'
import { ConfirmHost, ToastHost } from './components/kit'
import { initializeAuth, useAppState } from './data/store'
import Login from './screens/Login'
import QrAccess from './screens/QrAccess'
import Register from './screens/Register'
import Dashboard from './screens/Dashboard'
import Farmers from './screens/Farmers'
import FarmerDetail from './screens/FarmerDetail'
import FarmerForm from './screens/FarmerForm'
import NewVisit from './screens/NewVisit'
import CashAdvances from './screens/CashAdvances'
import Expenses from './screens/Expenses'
import Analytics from './screens/Analytics'
import SyncCenter from './screens/SyncCenter'
import type { AuthUser } from './domain/types'

function ProtectedApp() {
  const authenticated = useAppState((state) => state.auth.authenticated)
  const user = useAppState((state) => state.auth.user)
  if (!authenticated || user?.role !== 'farmer' || !user.farmerId) return <Navigate to="/login" replace />

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/farmers" element={<Farmers />} />
        <Route path="/farmers/new" element={<FarmerForm />} />
        <Route path="/farmers/:id" element={<OwnFarmerDetail farmerIds={ownedFarmerIds(user)} />} />
        <Route path="/farmers/:id/edit" element={<OwnFarmerForm farmerIds={ownedFarmerIds(user)} />} />
        <Route path="/farmers/:id/visit" element={<OwnFarmerVisit farmerIds={ownedFarmerIds(user)} />} />
        <Route path="/cash-advances" element={<CashAdvances />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/sync" element={<SyncCenter />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
      <ConfirmHost />
    </AppShell>
  )
}

function App() {
  const authReady = useAppState((state) => state.authReady)

  useEffect(() => {
    void initializeAuth()
  }, [])

  if (!authReady) {
    return <div className="login-screen"><p role="status">Connecting to the database...</p></div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/qr" element={<QrAccess />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<ProtectedApp />} />
      </Routes>
      <InstallAppPrompt />
    </BrowserRouter>
  )
}

function ownedFarmerIds(user: AuthUser): string[] {
  return user.farmerIds?.length ? user.farmerIds : user.farmerId ? [user.farmerId] : []
}

function OwnFarmerDetail({ farmerIds }: { farmerIds: string[] }) {
  const { id } = useParams()
  if (!id || !farmerIds.includes(id)) return <Navigate to="/farmers" replace />
  return <FarmerDetail />
}

function OwnFarmerForm({ farmerIds }: { farmerIds: string[] }) {
  const { id } = useParams()
  if (!id || !farmerIds.includes(id)) return <Navigate to="/farmers" replace />
  return <FarmerForm />
}

function OwnFarmerVisit({ farmerIds }: { farmerIds: string[] }) {
  const { id } = useParams()
  if (!id || !farmerIds.includes(id)) return <Navigate to="/farmers" replace />
  return <NewVisit />
}

export default App
