'use client';

import React from 'react';
import { CustomerShell } from '../../components/layout/customer-shell';
import { ComingSoonView } from '../../components/common/coming-soon-view';

export default function PlanPage() {
  return (
    <CustomerShell>
      <ComingSoonView
        moduleName="Strategic Planning"
        category="Playbooks & Roadmap"
        targetPhase="Phase 5 Delivery"
        description="Structured marketing and growth playbooks generated dynamically from your business goals, target industry, and current market visibility audit."
        plannedFeatures={[
          'Quarterly growth milestone sequencing',
          'Content calendar & publication timelines',
          'Budget allocation & return modeling',
          'Playbook library tailored for SMBs and enterprise',
        ]}
      />
    </CustomerShell>
  );
}

