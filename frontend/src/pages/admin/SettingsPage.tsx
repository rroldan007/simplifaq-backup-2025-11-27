/**
 * 🇨🇭 SimpliFaq - Admin Settings Page
 * 
 * System settings page for admin with global configurations and integrations
 */

import React from 'react';
import { SystemConfig } from '../../components/admin/SystemConfig';

export const SettingsPage: React.FC = () => {
  return (
    <div className="p-4">
      <SystemConfig />
    </div>
  );
};