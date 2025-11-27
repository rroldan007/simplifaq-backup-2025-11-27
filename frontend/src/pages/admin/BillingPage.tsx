/**
 * 🇨🇭 SimpliFaq - Admin Billing Page
 * 
 * Billing management page for admin with payment history and invoice management
 */

import React from 'react';
import { BillingHistory } from '../../components/admin/BillingHistory';

export const BillingPage: React.FC = () => {
  return (
    <div className="p-4">
      <BillingHistory />
    </div>
  );
};