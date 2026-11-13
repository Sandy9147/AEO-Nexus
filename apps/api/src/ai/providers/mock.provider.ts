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

    if (request.systemPrompt?.includes('DISCOVER_RESEARCH') || lower.includes('research topic:') || lower.includes('research') && lower.includes('objective')) {
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

