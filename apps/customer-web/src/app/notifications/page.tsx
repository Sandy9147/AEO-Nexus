'use client';

import React from 'react';
import { CustomerShell } from '../../components/layout/customer-shell';
import { ComingSoonView } from '../../components/common/coming-soon-view';

export default function NotificationsPage() {
  return (
    <CustomerShell>
      <ComingSoonView
        moduleName="Notification Center"
        category="Alerts & Feed"
        targetPhase="Phase 5 Delivery"
        description="Unified notification stream delivering real-time task completions, AI agent proposals, member activity alerts, and market movement notifications."
        plannedFeatures={[
          'Real-time WebSocket alerts and push notifications',
          'Granular notification channels (email, Slack, in-app)',
          'AI Agent approval requests and action prompts',
          'Weekly digest archive and compliance logs',
        ]}
      />
    </CustomerShell>
  );
}

