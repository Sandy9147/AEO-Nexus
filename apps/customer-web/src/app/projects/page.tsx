'use client';

import React from 'react';
import { CustomerShell } from '../../components/layout/customer-shell';
import { ComingSoonView } from '../../components/common/coming-soon-view';

export default function ProjectsPage() {
  return (
    <CustomerShell>
      <ComingSoonView
        moduleName="Projects & Campaigns"
        category="Workspace Projects"
        targetPhase="Phase 5 Delivery"
        description="Comprehensive workspace project management linking your strategic goals with deliverables, marketing assets, team tasks, and AI Agent runs."
        plannedFeatures={[
          'Kanban, list, and calendar milestone views',
          'Asset grouping by campaign and objective',
          'Direct task delegation to the AI Business Agent',
          'Real-time team collaboration comments and reviews',
        ]}
      />
    </CustomerShell>
  );
}

