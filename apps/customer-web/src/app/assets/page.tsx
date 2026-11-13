'use client';

import React from 'react';
import { CustomerShell } from '../../components/layout/customer-shell';
import { ComingSoonView } from '../../components/common/coming-soon-view';

export default function AssetsPage() {
  return (
    <CustomerShell>
      <ComingSoonView
        moduleName="Assets & Knowledge Vault"
        category="Content Repository"
        targetPhase="Phase 5 Delivery"
        description="Unified digital asset management storing your brand vectors, images, copy snippets, product specifications, and enterprise documentation."
        plannedFeatures={[
          'Semantic vector search across enterprise knowledge bases',
          'Asset tagging by brand voice and target persona',
          'Automated image optimization and CDN caching',
          'Version control for published marketing collateral',
        ]}
      />
    </CustomerShell>
  );
}

