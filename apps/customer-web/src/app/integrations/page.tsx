'use client';

import React from 'react';
import { CustomerShell } from '../../components/layout/customer-shell';
import { ComingSoonView } from '../../components/common/coming-soon-view';

export default function IntegrationsPage() {
  return (
    <CustomerShell>
      <ComingSoonView
        moduleName="Third-Party Integrations"
        category="Connectors & APIs"
        targetPhase="Phase 6 Delivery"
        description="Connect your existing software stack to AEO Nexus. Synchronize CRM contacts, Google Search Console metrics, social platforms, and cloud storage buckets."
        plannedFeatures={[
          'Google Search Console & Google Analytics 4 deep connector',
          'Salesforce, HubSpot, and Pipedrive synchronization',
          'Stripe billing and checkout webhook integration',
          'Cloud storage connectors for AWS S3 and Google Drive',
        ]}
      />
    </CustomerShell>
  );
}

