import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../state/auth';
export function Protected() { const { user, loading } = useAuth(); if (loading) return <div className="screen-center"><div className="spinner" aria-label="Loading session" /></div>; return user ? <Outlet /> : <Navigate to="/login" replace />; }
