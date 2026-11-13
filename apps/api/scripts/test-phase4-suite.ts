/**
 * Phase 4 Automated Verification Suite
 * Tests Projects, Tasks, Comments, Storage & Assets, Knowledge Base & Versioning,
 * Notifications, Activity Feed, and Cross-Workspace Isolation against Neon PostgreSQL.
 */
import { PrismaClient } from '@prisma/client';
import { ProjectsService } from '../src/projects/projects.service';
import { AssetsService } from '../src/assets/assets.service';
import { StorageService } from '../src/assets/storage.service';
import { KnowledgeService } from '../src/knowledge/knowledge.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { WorkspacesService } from '../src/workspaces/workspaces.service';
import { EmailService } from '../src/email/email.service';
import * as bcrypt from 'bcrypt';

async function runPhase4Suite() {
  console.log('================================================================');
  console.log('       AEO Nexus — Phase 4 Automated Verification Suite        ');
  console.log('================================================================');

  const prisma = new PrismaClient();
  const emailService = new EmailService();
  const workspacesService = new WorkspacesService(prisma, emailService);
  const projectsService = new ProjectsService(prisma, workspacesService);
  const storageService = new StorageService();
  const assetsService = new AssetsService(prisma, workspacesService, storageService);
  const knowledgeService = new KnowledgeService(prisma, workspacesService);
  const notificationsService = new NotificationsService(prisma, workspacesService);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  const runId = Math.random().toString(36).substring(2, 8);
  const user1Email = `phase4.owner.${runId}@aeonexus-test.local`;
  const user2Email = `phase4.collab.${runId}@aeonexus-test.local`;
  const user3Email = `phase4.intruder.${runId}@aeonexus-test.local`;
  const password = 'Password123!';
  const pwHash = await bcrypt.hash(password, 12);

  try {
    // 1. Setup Test Users & Workspaces
    console.log('\n--- Scenario 1: Setup Verified Users & Workspaces ---');
    const user1 = await prisma.user.create({
      data: {
        email: user1Email,
        passwordHash: pwHash,
        firstName: 'Sarah',
        lastName: 'Connor',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: user2Email,
        passwordHash: pwHash,
        firstName: 'John',
        lastName: 'Connor',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const user3 = await prisma.user.create({
      data: {
        email: user3Email,
        passwordHash: pwHash,
        firstName: 'Miles',
        lastName: 'Dyson',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const ws1 = await workspacesService.createWorkspace(user1.id, {
      name: `Cyberdyne Labs ${runId}`,
      slug: `cyberdyne-${runId}`,
    });

    // Add user2 as member of ws1
    await prisma.workspaceMember.create({
      data: {
        workspaceId: ws1.id,
        userId: user2.id,
        role: 'WORKSPACE_MEMBER',
      },
    });

    const ws2 = await workspacesService.createWorkspace(user3.id, {
      name: `External Enterprise ${runId}`,
      slug: `external-enterprise-${runId}`,
    });

    assert(Boolean(ws1.id && ws2.id), 'Successfully created isolated test workspaces');

    // 2. Project Lifecycle & Task Management
    console.log('\n--- Scenario 2: Project Lifecycle & Task Management ---');
    const project = await projectsService.createProject(ws1.id, user1.id, {
      name: 'Q4 Product Launch',
      description: 'Go-to-market execution and media rollout',
      status: 'PLANNING',
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      memberIds: [user2.id],
    });

    assert(project.name === 'Q4 Product Launch', 'Project created with correct name');
    assert(project.status === 'PLANNING', 'Project created with initial status PLANNING');
    assert(project.membersCount >= 2, 'Project includes owner and invited member');

    // Verify notification was sent to user2 for project invitation
    const user2Notifs = await notificationsService.listNotifications(ws1.id, user2.id);
    assert(
      user2Notifs.some((n) => n.title.includes('Project')),
      'Project member invitation triggered in-app notification',
    );

    // Create Tasks
    const task1 = await projectsService.createTask(ws1.id, user1.id, {
      projectId: project.id,
      title: 'Design Landing Page',
      description: 'Figma wireframes and brand alignment',
      status: 'TODO',
      priority: 'HIGH',
      assignedToId: user2.id,
    });

    const task2 = await projectsService.createTask(ws1.id, user1.id, {
      projectId: project.id,
      title: 'Setup Analytics & Tracking',
      status: 'TODO',
      priority: 'MEDIUM',
    });

    assert(task1.title === 'Design Landing Page', 'Task 1 created with title');
    assert(task1.priority === 'HIGH', 'Task 1 priority set to HIGH');
    assert(task1.assignedToId === user2.id, 'Task 1 assigned to John Connor');

    // Task & Project Comments
    const taskComment = await projectsService.createTaskComment(ws1.id, user2.id, task1.id, {
      content: 'Wireframes completed in Figma, ready for copy review.',
    });
    assert(taskComment.content.includes('Wireframes'), 'Task comment created successfully');

    const projectComment = await projectsService.createProjectComment(ws1.id, user1.id, project.id, {
      content: 'Targeting launch date for end of next week.',
    });
    assert(projectComment.content.includes('Targeting launch'), 'Project comment posted successfully');

    // Update Task Status & verify progress
    const updatedTask1 = await projectsService.updateTask(ws1.id, user2.id, task1.id, {
      status: 'COMPLETED',
    });
    assert(updatedTask1.status === 'COMPLETED', 'Task 1 status transitioned to COMPLETED');

    const projectDetail = await projectsService.getProject(ws1.id, user1.id, project.id);
    assert(projectDetail.progress === 50, 'Project progress automatically recalculated to 50%');

    // Archive Project
    const archivedProj = await projectsService.archiveProject(ws1.id, user1.id, project.id);
    assert(archivedProj.status === 'ARCHIVED', 'Project archived successfully');

    // 3. Storage Abstraction & Asset Management
    console.log('\n--- Scenario 3: Storage Abstraction & Asset Management ---');
    const storageStatus = assetsService.getStorageStatus();
    assert(
      typeof storageStatus.isConfigured === 'boolean',
      `Storage status detected (configured: ${storageStatus.isConfigured}, provider: ${storageStatus.provider})`,
    );

    // Create Folder
    const folder = await assetsService.createFolder(ws1.id, user1.id, {
      name: 'Brand Collateral',
    });
    assert(folder.name === 'Brand Collateral', 'Asset folder created');

    // Create Asset Metadata
    const asset = await assetsService.createAsset(ws1.id, user1.id, {
      name: 'Logo-Master-Vector.svg',
      storageKey: `workspaces/${ws1.id}/${folder.id}/logo.svg`,
      url: 'https://storage.aeonexus.local/logo.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 15420,
      folderId: folder.id,
      metadata: { width: 800, height: 600 },
    });
    assert(asset.name === 'Logo-Master-Vector.svg', 'Asset metadata record created');
    assert(asset.folder?.id === folder.id, 'Asset linked to parent folder');

    // List Assets with search
    const assetList = await assetsService.getAssets(ws1.id, user1.id, {
      folderId: folder.id,
      search: 'Logo',
    });
    assert(assetList.length === 1, 'Assets filtered by folder and search correctly');

    // 4. Business Knowledge Base & Auto-Versioning
    console.log('\n--- Scenario 4: Business Knowledge Base & Versioning ---');
    const doc = await knowledgeService.createDocument(ws1.id, user1.id, {
      title: 'Customer Refund & Service Guarantee',
      category: 'POLICIES',
      content: 'We offer a 30-day money back guarantee on all premium subscription tiers.',
      status: 'PUBLISHED',
      tags: ['refund', 'guarantee', 'billing'],
      sourceUrl: 'https://aeonexus.com/guarantee',
    });

    assert(doc.title === 'Customer Refund & Service Guarantee', 'Knowledge document created');
    assert(doc.currentVersion === 1, 'Knowledge document initialized at version 1');
    assert(doc.category === 'POLICIES', 'Knowledge document category set to POLICIES');

    // Update Document Content -> Should trigger version 2
    const updatedDoc = await knowledgeService.updateDocument(ws1.id, user1.id, doc.id, {
      content: 'We offer a 60-day unconditional refund policy for all annual contracts.',
      changeNote: 'Extended refund window from 30 to 60 days',
    });

    assert(updatedDoc.currentVersion === 2, 'Knowledge document content update incremented to version 2');

    const docDetail = await knowledgeService.getDocument(ws1.id, user1.id, doc.id);
    assert(docDetail.versions.length === 2, 'Document preserves complete revision history (2 versions)');
    assert(
      docDetail.versions[0].changeNote === 'Extended refund window from 30 to 60 days',
      'Version change summary recorded accurately',
    );

    // 5. Notifications & Activity Feed
    console.log('\n--- Scenario 5: Notifications & Activity Feed ---');
    const notifs = await notificationsService.listNotifications(ws1.id, user2.id);
    assert(notifs.length > 0, 'Notifications retrieved for assigned user');

    const markReadResult = await notificationsService.markAllAsRead(ws1.id, user2.id);
    assert(markReadResult.updatedCount >= 1, 'Marked all user notifications as read');

    const unreadNotifs = await notificationsService.listNotifications(ws1.id, user2.id, true);
    assert(unreadNotifs.length === 0, 'Zero unread notifications remaining');

    const activityFeed = await notificationsService.listActivityFeed(ws1.id, user1.id, 20);
    assert(activityFeed.length >= 4, 'Activity feed records project, task, folder, and knowledge events');

    // 6. Cross-Workspace Security & Strict Isolation
    console.log('\n--- Scenario 6: Cross-Workspace Security & Isolation ---');

    // User 3 (Workspace 2) attempts to access Workspace 1's projects
    let projForbidden = false;
    try {
      await projectsService.listProjects(ws1.id, user3.id);
    } catch {
      projForbidden = true;
    }
    assert(projForbidden, 'Intruder blocked from listing Workspace 1 projects');

    // User 3 attempts to access Workspace 1's tasks
    let taskForbidden = false;
    try {
      await projectsService.getProject(ws1.id, user3.id, project.id);
    } catch {
      taskForbidden = true;
    }
    assert(taskForbidden, 'Intruder blocked from reading Workspace 1 project details');

    // User 3 attempts to list Workspace 1 assets
    let assetForbidden = false;
    try {
      await assetsService.getAssets(ws1.id, user3.id);
    } catch {
      assetForbidden = true;
    }
    assert(assetForbidden, 'Intruder blocked from reading Workspace 1 assets');

    // User 3 attempts to read Workspace 1 knowledge document
    let kbForbidden = false;
    try {
      await knowledgeService.getDocument(ws1.id, user3.id, doc.id);
    } catch {
      kbForbidden = true;
    }
    assert(kbForbidden, 'Intruder blocked from reading Workspace 1 knowledge document');

    // User 3 attempts to read Workspace 1 activity feed
    let activityForbidden = false;
    try {
      await notificationsService.listActivityFeed(ws1.id, user3.id);
    } catch {
      activityForbidden = true;
    }
    assert(activityForbidden, 'Intruder blocked from reading Workspace 1 activity feed');

    // Cleanup Test Data
    console.log('\n--- Cleaning Up Test Data ---');
    await prisma.workspace.delete({ where: { id: ws1.id } });
    await prisma.workspace.delete({ where: { id: ws2.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [user1.id, user2.id, user3.id] } },
    });
    console.log('  [PASS] Test workspaces and users cleanly deleted');
  } catch (err: any) {
    console.error('Unhandled suite error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Suite();
