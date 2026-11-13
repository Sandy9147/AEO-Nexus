'use client';

import React from 'react';
import { CustomerShell } from '../../components/layout/customer-shell';
import { ComingSoonView } from '../../components/common/coming-soon-view';

export default function BillingPage() {
  return (
    <CustomerShell>
      <ComingSoonView
        moduleName="Billing & Usage Telemetry"
        category="Subscription & Seats"
        targetPhase="Phase 8 Delivery"
        description="Subscription tier management, metered LLM token usage tracking, seat provisioning, and enterprise invoice downloads."
        plannedFeatures={[
          'Stripe Customer Portal embedded billing integration',
          'Real-time token and compute consumption metering',
          'Team seat provisioning and add-ons',
          'Automated invoice generation and tax compliance',
        ]}
      />
    </CustomerShell>
  );
}

