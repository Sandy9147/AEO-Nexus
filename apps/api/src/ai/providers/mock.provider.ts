import { Injectable, Logger } from '@nestjs/common';
import {
  IAiProviderAdapter,
  AiCompletionRequest,
  AiCompletionResponse,
  AiStreamChunk,
  ModelCapability,
  MODEL_CATALOG,
  ToolCallExecution,
  ToolCallCitation,
} from './ai-provider.interface';

@Injectable()
export class MockAiProvider implements IAiProviderAdapter {
  readonly id = 'mock' as const;
  private readonly logger = new Logger(MockAiProvider.name);

  isConfigured(): boolean {
    return true; // Always available as embedded sandbox / offline fallback
  }

  getAvailableModels(): ModelCapability[] {
    return MODEL_CATALOG.filter((m) => m.provider === 'mock');
  }

  async generateCompletion(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const lastUserMessage = [...request.messages].reverse().find((m) => m.role === 'user')?.content || '';
    const lower = lastUserMessage.toLowerCase();

    const toolCalls: ToolCallExecution[] = [];
    const citations: ToolCallCitation[] = [];

    // Smart heuristic: if user asks for specific actions and tools are available, propose tool execution
    if (request.tools && request.tools.length > 0) {
      if (lower.includes('project') && (lower.includes('list') || lower.includes('show') || lower.includes('what'))) {
        toolCalls.push({
          id: `call_${Date.now()}_1`,
          toolName: 'list_workspace_projects',
          args: { limit: 10 },
        });
      } else if (lower.includes('task') && (lower.includes('list') || lower.includes('show') || lower.includes('what'))) {
        toolCalls.push({
          id: `call_${Date.now()}_2`,
          toolName: 'list_assigned_tasks',
          args: { limit: 10 },
        });
      } else if (lower.includes('profile') || lower.includes('business')) {
        toolCalls.push({
          id: `call_${Date.now()}_3`,
          toolName: 'get_business_profile',
          args: {},
        });
      } else if (lower.includes('brand') || lower.includes('color') || lower.includes('voice')) {
        toolCalls.push({
          id: `call_${Date.now()}_4`,
          toolName: 'get_brand_identity',
          args: {},
        });
      } else if (lower.includes('create project') || lower.includes('new project') || lower.includes('draft project')) {
        toolCalls.push({
          id: `call_${Date.now()}_5`,
          toolName: 'create_draft_project',
          args: {
            name: 'Q1 Organic Search Optimization',
            description: 'Strategic project created by AI Agent to optimize core landing pages for Answer Engine visibility.',
          },
        });
      } else if (lower.includes('create task') || lower.includes('new task') || lower.includes('draft task')) {
        toolCalls.push({
          id: `call_${Date.now()}_6`,
          toolName: 'create_draft_task',
          args: {
            title: 'Audit FAQ Schema Markup',
            description: 'Inspect published knowledge documents and generate JSON-LD schema for search engines.',
            priority: 'HIGH',
          },
        });
      } else if (lower.includes('search') || lower.includes('knowledge') || lower.includes('doc') || lower.includes('policy')) {
        toolCalls.push({
          id: `call_${Date.now()}_7`,
          toolName: 'search_knowledge_vault',
          args: { query: lastUserMessage.substring(0, 50) },
        });
      }
    }

    let responseContent: string;

    if (
      request.systemPrompt?.includes('STRATEGIC_PLAN') ||
      request.systemPrompt?.includes('PLAN_GENERATION') ||
      request.systemPrompt?.includes('Strategic Business Plan') ||
      lower.includes('plan generation') ||
      lower.includes('strategic plan') ||
      lower.includes('strategic_plan') ||
      lower.includes('generate a strategic plan')
    ) {
      const planData = {
        executiveSummary: `Strategic market expansion and Answer Engine Optimization growth plan for the workspace. This plan outlines a phased path to capture category dominance across conversational search and AI answer engines, while establishing sustainable customer acquisition channels.`,
        currentSituation: `The organization possesses a strong foundational product architecture and indexed knowledge base, but currently lacks automated answer engine visibility diagnostics and structured multi-channel distribution.`,
        marketPositioning: `Category-defining Answer Engine Optimization and Autonomous Business Platform for mid-market SaaS and high-velocity digital agencies.`,
        strategicObjectives: [
          'Achieve >35% share of AI citations across target product keywords within 6 months.',
          'Scale monthly recurring revenue by 150% through high-intent generative inbound search.',
          'Deploy automated knowledge vault synchronization to eliminate multi-channel messaging drift.'
        ],
        targetAudience: `Founders, Chief Marketing Officers, and Growth Leaders at B2B SaaS organizations and modern marketing agencies seeking to capitalize on AI-first discovery.`,
        requiredResources: [
          'Engineering team dedicated to AEO diagnostic crawler infrastructure.',
          'Content strategist for structured entity relationship mapping.',
          'Cloud infrastructure allocation for continuous multi-model citation benchmarking.'
        ],
        budgetAssumptions: [
          '$15,000 for AI search API integration & multi-model evaluation compute.',
          '$8,000 for pilot customer validation cohorts and incentive programs.',
          '$5,000 for brand asset harmonization and PR outreach.'
        ],
        risksAndMitigations: [
          {
            risk: 'Rapid algorithm updates from generative search providers (Perplexity, ChatGPT, Gemini).',
            mitigation: 'Implement provider-agnostic citation probing with automated prompt drift alerts.',
            severity: 'HIGH',
            likelihood: 'HIGH'
          },
          {
            risk: 'Customer hesitation around adopting new AEO visibility metrics vs traditional SEO.',
            mitigation: 'Provide side-by-side SERP vs Generative Citation parity dashboards with verifiable ROI.',
            severity: 'MEDIUM',
            likelihood: 'MEDIUM'
          }
        ],
        dependencies: [
          'Completion of Phase 4 Knowledge Base entity extraction pipeline.',
          'Verification of customer domain ownership for automated schema injection.'
        ],
        timelineAssumptions: [
          'Phase 1 foundation requires 4 weeks of technical indexing and benchmark baseline.',
          'Phase 2 active outreach and pilot deployment requires 6 weeks.',
          'Phase 3 broad market launch and partner integration targets Q3.'
        ],
        successMetrics: [
          'Citation Share: Increase from 0% baseline to 35% in targeted AI prompts.',
          'Qualified Inbound Leads: 120+ verified demo requests originating from AI answers.',
          'Knowledge Accuracy Score: 99.5% fidelity across automated answers.'
        ],
        validationRequirements: [
          'Run controlled 30-day citation benchmark against 10 primary competitors.',
          'Validate customer Willingness-To-Pay through 20 structured interviews.',
          'Demonstrate zero latency degradation in knowledge retrieval endpoints.'
        ],
        nextRecommendedActions: [
          'Approve the Phase 1 Foundation Initiative and convert into active engineering sprint.',
          'Establish weekly citation review cadence with marketing and product owners.',
          'Connect Discover research findings directly to roadmap milestones.'
        ],
        confidenceScore: 0.92,
        goals: [
          {
            title: 'Achieve 35% Answer Engine Citation Share',
            description: 'Secure verified brand citations across Perplexity, ChatGPT Search, and Google AI Overviews for top 50 industry queries.',
            category: 'AEO_VISIBILITY',
            targetValue: 35,
            currentValue: 5,
            unit: '%',
            priority: 'CRITICAL',
            measurementFrequency: 'WEEKLY',
            isQualitative: false
          },
          {
            title: 'Generate $250k Annualized Pipeline from AI Search',
            description: 'Direct attribution of qualified inbound pipeline from conversational answer recommendations.',
            category: 'REVENUE',
            targetValue: 250000,
            currentValue: 15000,
            unit: 'USD',
            priority: 'HIGH',
            measurementFrequency: 'MONTHLY',
            isQualitative: false
          },
          {
            title: 'Publish Harmonized Brand Knowledge Vault',
            description: 'Achieve complete internal alignment across product features, brand positioning, and pricing documentation.',
            category: 'OPERATIONAL_EFFICIENCY',
            targetValue: 100,
            currentValue: 40,
            unit: '%',
            priority: 'HIGH',
            measurementFrequency: 'BI_WEEKLY',
            isQualitative: true
          }
        ],
        initiatives: [
          {
            name: 'AEO Citation Diagnostic Crawler & Entity Injector',
            description: 'Develop automated crawler to run synthetic prompt evaluations and inject structured JSON-LD entity schema.',
            strategicRationale: 'Directly addresses the emerging shift from keyword search to conversational AI answers.',
            priority: 'CRITICAL',
            expectedImpact: 'HIGH',
            estimatedEffort: 'HIGH',
            estimatedCost: '$12,000',
            risks: ['Frequent API structure changes by LLM providers', 'Crawler rate limiting'],
            recommendedActions: [
              'Deploy nightly prompt diagnostic sweeps across top 50 industry queries',
              'Generate dynamic schema markup recommendations for top 20 landing pages'
            ],
            evidenceType: 'AI_ANALYSIS'
          },
          {
            name: 'Autonomous Knowledge Vault Harmonizer',
            description: 'Synchronize verified company docs, brand guidelines, and pricing into an authoritative vector knowledge base.',
            strategicRationale: 'Eliminates conflicting citations and ensures LLMs receive precise, up-to-date facts.',
            priority: 'HIGH',
            expectedImpact: 'HIGH',
            estimatedEffort: 'MEDIUM',
            estimatedCost: '$6,000',
            risks: ['Outdated customer documentation being ingested'],
            recommendedActions: [
              'Conduct workspace document audit',
              'Set up human-in-the-loop review workflow for draft knowledge articles'
            ],
            evidenceType: 'AI_ANALYSIS'
          },
          {
            name: 'Pilot Customer Proof-of-Concept Program',
            description: 'Onboard 15 early-adopter B2B SaaS accounts to validate citation uplift and gather case study data.',
            strategicRationale: 'Provides verified proof points for broad public launch and marketing collateral.',
            priority: 'HIGH',
            expectedImpact: 'MEDIUM',
            estimatedEffort: 'LOW',
            estimatedCost: '$3,500',
            risks: ['Customer churn if early citation gains fluctuate'],
            recommendedActions: [
              'Draft customer onboarding playbook',
              'Schedule bi-weekly review meetings with pilot stakeholders'
            ],
            evidenceType: 'AI_ANALYSIS'
          }
        ],
        roadmaps: [
          {
            title: 'Strategic AEO Market Execution Roadmap',
            description: 'Phased rollout from technical foundation to pilot customer validation and market launch.',
            phases: [
              {
                phaseOrder: 1,
                name: 'Phase 1: Foundation & Diagnostic Baseline',
                description: 'Build core crawlers, audit existing brand citations, and deploy knowledge schema.',
                milestones: [
                  {
                    title: 'Diagnostic Crawler MVP Live',
                    description: 'Automated prompt testing running against Perplexity and OpenAI search.',
                    targetDays: 21,
                    successCriteria: 'Daily citation reports generated for top 50 target keywords with zero missed runs.'
                  },
                  {
                    title: 'Brand Knowledge Base Certified',
                    description: 'All core documentation verified and synced to knowledge vault.',
                    targetDays: 35,
                    successCriteria: '100% of product and pricing docs audited with human approval.'
                  }
                ]
              },
              {
                phaseOrder: 2,
                name: 'Phase 2: Customer Validation & Acceleration',
                description: 'Onboard pilot cohort, verify citation increases, and refine scoring algorithms.',
                milestones: [
                  {
                    title: '15 Active Pilot Accounts Onboarded',
                    description: 'Full telemetry enabled and bi-weekly reviews initiated.',
                    targetDays: 60,
                    successCriteria: '15 enterprise workspaces using daily citation tracking.'
                  },
                  {
                    title: 'First 5 Documented Citation Wins',
                    description: 'Verify 5 distinct brand inclusions in LLM answers resulting from injected schema.',
                    targetDays: 75,
                    successCriteria: 'Documented before-and-after citation proof with customer signoff.'
                  }
                ]
              },
              {
                phaseOrder: 3,
                name: 'Phase 3: Broad Market Launch',
                description: 'Commercial GA release with self-serve onboarding and partner integrations.',
                milestones: [
                  {
                    title: 'Public Launch Announcement',
                    description: 'Press release, Product Hunt debut, and customer webinars.',
                    targetDays: 90,
                    successCriteria: 'Over 500 new workspace signups in the first 14 days.'
                  }
                ]
              }
            ]
          }
        ],
        recommendations: [
          {
            title: 'Prioritize Schema Markup Injection over General Backlinks',
            recommendation: 'Answer engines prioritize semantic schema clarity over raw link volume when selecting authoritative citation sources.',
            category: 'STRATEGY',
            impact: 'HIGH',
            urgency: 'HIGH',
            evidenceType: 'AI_ANALYSIS'
          },
          {
            title: 'Institute Monthly Strategy Review Cadence',
            recommendation: 'Establish formal monthly executive reviews to rebalance initiative priorities against live citation metrics.',
            category: 'GOVERNANCE',
            impact: 'MEDIUM',
            urgency: 'MEDIUM',
            evidenceType: 'AI_ANALYSIS'
          }
        ]
      };
      responseContent = JSON.stringify(planData, null, 2);
    } else if (request.systemPrompt?.includes('DISCOVER_RESEARCH') || lower.includes('research topic:') || lower.includes('research') && lower.includes('objective')) {
      const researchData = {
        executiveSummary: `Comprehensive market and opportunity intelligence analysis for "${lastUserMessage.slice(0, 100)}". This analysis synthesized industry signals, search demand, competitive landscapes, and audience friction points.`,
        methodology: `Multi-signal AI synthesis incorporating workspace brand context, published knowledge base documents, and structured competitive benchmarking.`,
        confidenceScore: 0.88,
        findings: [
          {
            category: 'MARKET_DEMAND',
            title: 'Surging Demand for Autonomous Workflow Orchestration',
            description: 'Mid-market businesses are experiencing high operational friction in multi-tool context switching, creating strong demand for integrated agentic platforms.',
            evidenceType: 'AI_ANALYSIS',
            confidenceLevel: 'HIGH',
            evidenceDetails: 'Synthesized from customer queries, product capability gaps, and emerging B2B automation signals.',
            risks: 'Rapid market entry by horizontal productivity platforms.',
            recommendations: 'Focus on vertical-specific Answer Engine Optimization (AEO) and turnkey business workflows.'
          },
          {
            category: 'COMPETITIVE_LANDSCAPE',
            title: 'Incumbents Lack Real-Time Answer Engine Visibility Diagnostics',
            description: 'Existing solutions focus primarily on legacy search engine ranking (SEO) rather than generative answer retrieval and LLM citation presence.',
            evidenceType: 'AI_ANALYSIS',
            confidenceLevel: 'HIGH',
            evidenceDetails: 'Analysis of top market competitors indicates traditional keyword rank tracking without generative engine indexing.',
            risks: 'Search engines frequently adjust LLM citation algorithms.',
            recommendations: 'Establish proprietary citation share metrics and answer gap analysis.'
          },
          {
            category: 'TREND',
            title: 'Shift from Keyword Search to Conversational Intent Engines',
            description: 'Over 40% of B2B buyer discovery journeys now begin with generative AI assistants rather than traditional query lists.',
            evidenceType: 'AI_ANALYSIS',
            confidenceLevel: 'MEDIUM',
            evidenceDetails: 'Emerging technology trends across AI search engines (Perplexity, ChatGPT Search, Gemini).',
            risks: 'Attribution and measurement opacity in closed LLM ecosystems.',
            recommendations: 'Publish structured knowledge vaults with clear entity markup.'
          }
        ],
        opportunities: [
          {
            title: 'Automated Answer Engine Citation Diagnostic Suite',
            description: 'A proactive diagnostic tool that audits brand visibility across Perplexity, ChatGPT, and Google AI Overviews.',
            customerProblem: 'Brands are losing organic referral traffic to AI search engines without visibility into whether they are being cited.',
            marketDemandEvidence: 'High search growth for "AEO optimization" and "AI search engine ranking".',
            competitionAnalysis: 'Incumbent SEO tools offer zero native AEO metrics.',
            differentiation: 'Real-time multi-model benchmarking with actionable schema generation.',
            businessFeasibility: 'High feasibility leveraging existing AEO Nexus LLM adapter infrastructure.',
            potentialBusinessModel: 'Tiered monthly SaaS subscription based on query volume.',
            assumptions: ['AI search citation patterns correlate with structured schema adoption', 'B2B buyers continue shifting to AI answers'],
            risks: ['LLM providers modifying citation display formats', 'Scraping / query throttling by LLMs'],
            confidenceLevel: 'HIGH',
            suggestedExperiment: 'Launch a free 5-query AEO visibility audit for 50 pilot customers and measure conversion.',
            evidenceType: 'AI_ANALYSIS'
          },
          {
            title: 'Autonomous Multi-Agent Content Harmonizer',
            description: 'System that synchronizes company knowledge documents directly into brand voice across all digital customer touchpoints.',
            customerProblem: 'Marketing, sales, and support teams present inconsistent company information.',
            marketDemandEvidence: 'Customer interview feedback citing knowledge fragmentation as #1 operational bottleneck.',
            competitionAnalysis: 'Point solutions exist for docs, but none connect to autonomous execution tools.',
            differentiation: 'Direct integration with project management and task workflows.',
            businessFeasibility: 'Built directly upon Phase 4 knowledge base and Phase 5 tool registry.',
            potentialBusinessModel: 'Per-seat add-on license for Enterprise workspaces.',
            assumptions: ['Teams have published knowledge documents ready to harmonize'],
            risks: ['Resistance to automated content updates without human approval'],
            confidenceLevel: 'MEDIUM',
            suggestedExperiment: 'Implement human-in-the-loop review for all harmonized drafts in 10 trial accounts.',
            evidenceType: 'AI_ANALYSIS'
          }
        ],
        competitors: [
          {
            name: 'LegacySEO Pro',
            website: 'https://example-legacyseo.com',
            industry: 'Search Marketing Software',
            description: 'Traditional SEO platform focused on Google SERP keyword rank tracking and backlink matrices.',
            productsServices: 'Keyword Explorer, Backlink Audit, Rank Tracker',
            positioning: 'Standard SEO software for digital marketing agencies.',
            pricingObservations: 'Entry tier $99/mo up to Enterprise $499/mo.',
            contentObservations: 'Extensive blog catalog focused on Google 10 blue links.',
            strengths: ['Large installed customer base', 'Deep historical backlink index'],
            weaknesses: ['No generative AI answer engine tracking', 'No autonomous execution agents'],
            differentiationOpportunities: 'Position AEO Nexus as the modern alternative built specifically for the Answer Engine era.',
            evidenceType: 'AI_ANALYSIS',
            isVerified: false
          },
          {
            name: 'Synthetix AI Copilot',
            website: 'https://example-synthetix.com',
            industry: 'AI Productivity',
            description: 'Generic AI writing assistant for marketing copy.',
            productsServices: 'Blog generator, Social media scheduler',
            positioning: 'Fast generative copywriting for solo creators.',
            pricingObservations: '$29/mo flat rate.',
            contentObservations: 'Short-form social content and promotional ads.',
            strengths: ['Low price point', 'Easy onboarding'],
            weaknesses: ['Zero workspace context or knowledge vault', 'No project management integration'],
            differentiationOpportunities: 'Provide enterprise-grade governance, human approvals, and full business context.',
            evidenceType: 'AI_ANALYSIS',
            isVerified: false
          }
        ],
        audienceProfiles: [
          {
            segmentName: 'High-Growth SaaS Founders & CMOs',
            isAiGenerated: true,
            idealCustomerProfile: 'B2B SaaS companies with $1M-$20M ARR looking to capture buyer demand in generative search.',
            demographics: 'Founders, VP Marketing, Chief Growth Officers in North America and Europe.',
            painPoints: ['Declining traditional organic search traffic', 'Lack of visibility into LLM recommendations', 'Siloed marketing and engineering execution'],
            needs: ['Accurate AEO citation tracking', 'Autonomous tools to remediate knowledge gaps', 'Measurable ROI on AI optimization'],
            buyingMotivations: ['Regaining category leadership', 'Preventing competitors from owning AI answers', 'Automating manual research'],
            objections: ['Is AEO just a passing buzzword?', 'How is this different from regular SEO?', 'Will it work with our existing stack?'],
            customerJourney: {
              awareness: ['Experiences traffic drop from Google Search', 'Notices competitor being cited in Perplexity answers'],
              consideration: ['Tests AEO Nexus free research diagnostic', 'Reviews opportunity report and competitive matrix'],
              decision: ['Upgrades to full platform to execute automated validation experiments']
            }
          }
        ],
        sources: [
          {
            title: 'AEO Nexus Verified Business Profile & Knowledge Vault',
            url: 'vault://workspace/knowledge-docs',
            sourceType: 'KNOWLEDGE_VAULT',
            publicationDate: '2026-11-13',
            snippet: 'Internal verified business context and brand voice guidelines extracted from workspace repository.',
            isVerified: true
          },
          {
            title: 'Generative Search & Answer Engine Industry Benchmarks',
            url: 'https://research.example.com/reports/generative-search-2026',
            sourceType: 'INDUSTRY_REPORT',
            publicationDate: '2026-10-01',
            snippet: 'Analysis of answer engine citation distribution across Perplexity, ChatGPT Search, and Google AI Overviews.',
            isVerified: false
          }
        ],
        aeoQuestions: [
          {
            topic: 'Answer Engine Visibility',
            queryQuestion: 'What are the top software platforms for Answer Engine Optimization in 2026?',
            targetIndustry: 'SaaS / Marketing Tech',
            expectedPersona: 'Growth Marketer',
            brandMentioned: true,
            brandRank: 1,
            brandSentiment: 'POSITIVE',
            competitorsMentioned: ['LegacySEO Pro', 'Synthetix AI Copilot'],
            citations: [
              { title: 'The Rise of AEO Platforms', url: 'https://techradar.example.com/aeo-platforms', snippet: 'AEO Nexus leads the category with autonomous context extraction and real-time LLM audit.' }
            ],
            rawAnswerExcerpt: 'Top platforms for Answer Engine Optimization include AEO Nexus, which provides full-cycle business discovery and citation tracking...',
            isActualMeasurement: false
          },
          {
            topic: 'Autonomous Business Agents',
            queryQuestion: 'How can small businesses automate project planning and market discovery with AI?',
            targetIndustry: 'Small Business / Agency',
            expectedPersona: 'Business Owner',
            brandMentioned: true,
            brandRank: 2,
            brandSentiment: 'POSITIVE',
            competitorsMentioned: ['Synthetix AI Copilot'],
            citations: [
              { title: 'AI Business Agents Overview', url: 'https://business.example.com/ai-agents', snippet: 'Integrated business agent platforms provide bounded workspace context and human-in-the-loop governance.' }
            ],
            rawAnswerExcerpt: 'Modern AI business agents like AEO Nexus enable businesses to conduct deep market opportunity research and organize deliverables...',
            isActualMeasurement: false
          }
        ]
      };
      responseContent = JSON.stringify(researchData, null, 2);
    } else if (toolCalls.length > 0) {
      const toolNames = toolCalls.map((t) => t.toolName).join(', ');
      responseContent = `I have inspected your request and identified that we should retrieve information using the following workspace tools: **${toolNames}**. Executing tools within your verified workspace security perimeter...`;
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      responseContent = `Hello! I am your **AEO Nexus AI Business Agent**. I have full contextual awareness of your workspace, active projects, brand guidelines, and knowledge base. How can I assist you with your operations, strategy, or deliverables today?`;
    } else if (lower.includes('who are you') || lower.includes('what can you do')) {
      responseContent = `I am the **AEO Nexus AI Business Agent** — an autonomous co-pilot built to operate your business systems. I can inspect your business profile, query your knowledge vault with strict citations, track active projects, organize tasks, search available tools, and draft deliverables. Sensitive actions (such as publishing content or deleting data) will always request your explicit approval.`;
    } else {
      responseContent = `I have analyzed your request: "${lastUserMessage}". Working within your workspace boundary, I can coordinate your team's deliverables, search our verified business knowledge vault, or initiate strategic drafts. Let me know if you would like me to create a task, query your business profile, or review active projects.`;
    }

    const promptTokens = Math.max(15, Math.ceil(lastUserMessage.length / 4));
    const completionTokens = Math.max(25, Math.ceil(responseContent.length / 4));

    return {
      content: responseContent,
      provider: 'mock',
      model: request.model || 'mock-agent-fast',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      citations: citations.length > 0 ? citations : undefined,
    };
  }

  async *generateStream(request: AiCompletionRequest): AsyncIterable<AiStreamChunk> {
    const full = await this.generateCompletion(request);
    const words = full.content.split(' ');

    for (let i = 0; i < words.length; i++) {
      const isComplete = i === words.length - 1;
      yield {
        delta: words[i] + (isComplete ? '' : ' '),
        isComplete,
        ...(isComplete ? { toolCalls: full.toolCalls, citations: full.citations, usage: full.usage } : {}),
      };
    }
  }
}

