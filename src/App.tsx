/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import TournamentDetails from './pages/TournamentDetails';
import TeamDetails from './pages/TeamDetails';
import Admin from './pages/Admin';
import CompareTeams from './pages/CompareTeams';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="tournaments/:id" element={<TournamentDetails />} />
          <Route path="teams/:id" element={<TeamDetails />} />
          <Route path="compare" element={<CompareTeams />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
