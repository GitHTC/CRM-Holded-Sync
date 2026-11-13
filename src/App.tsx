/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProvider, useAppContext } from './context/AppContext';
import { Layout } from './components/Layout';
import { CRMView } from './components/CRMView';
import { ProjectsView } from './components/ProjectsView';
import { SettingsView } from './components/SettingsView';

function AppContent() {
  const { holdedUserId, activeTab } = useAppContext();

  // If missing user setup, force Settings view
  if (!holdedUserId) {
    return (
      <Layout>
        <SettingsView />
      </Layout>
    );
  }

  return (
    <Layout>
      {activeTab === 'crm' && <CRMView />}
      {activeTab === 'projects' && <ProjectsView />}
      {activeTab === 'settings' && <SettingsView />}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

