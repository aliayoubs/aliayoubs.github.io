import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { createContext, useContext, useState } from 'react';
import { Navbar } from './components/layout/Shell';
import Home from './pages/Home';
import References from './pages/References';
import Dashboard from './pages/Dashboard';
import { About, ComingSoon, Methodology, NotFound } from './pages/Informational';
import type { DataMode } from './types';
const ModeContext = createContext<{ mode: DataMode; setMode: (m: DataMode) => void }>({ mode: 'verified', setMode: () => {} });
export const useMode = () => useContext(ModeContext);
export default function App() {
  const location = useLocation();
  const [mode, setMode] = useState<DataMode>('verified');
  // Minimal landing page + self-contained mission dashboard. Existing informational pages unchanged.
  const showLegacyNav = !['/', '/dashboard/lebanon', '/references', '/sources'].includes(location.pathname);
  return <ModeContext.Provider value={{ mode, setMode }}>
    {showLegacyNav && <Navbar />}
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard/lebanon" element={<Dashboard />} />
      <Route path="/methodology" element={<Methodology />} />
      <Route path="/sources" element={<Navigate to="/references" replace />} />
      <Route path="/references" element={<References />} />
      <Route path="/about" element={<About />} />
      <Route path="/regions/:id" element={<ComingSoon />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </ModeContext.Provider>;
}
