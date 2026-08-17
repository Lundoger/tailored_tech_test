import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { hash } from '@node-rs/argon2';

import { AppModule } from '../app.module';
import { loadRootEnv } from '../config/load-env';
import { DataRoomsService } from '../data-rooms/data-rooms.service';
import { FilesService } from '../files/files.service';
import { NodesService } from '../nodes/nodes.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { createPdf } from './pdf';
import { ARCHIVE_ROOM, DEMO_ROOM, type SeedEntry } from './seed-data';

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'datar00m-demo';

const OWNER = { email: 'owner@acme.test', name: 'Dana Whitfield' };
const VIEWER = { email: 'viewer@acme.test', name: 'Sam Okafor' };

async function main(): Promise<void> {
  loadRootEnv();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const prisma = app.get(PrismaService);
  const storage = app.get(StorageService);
  const dataRooms = app.get(DataRoomsService);
  const nodes = app.get(NodesService);
  const files = app.get(FilesService);

  console.log(`Seeding via the "${storage.driverName}" storage driver…`);

  await reset(prisma, storage);

  const passwordHash = await hash(DEMO_PASSWORD);
  const owner = await prisma.user.create({ data: { ...OWNER, passwordHash } });
  const viewer = await prisma.user.create({ data: { ...VIEWER, passwordHash } });

  let folderCount = 0;
  let fileCount = 0;

  const buildTree = async (
    entries: SeedEntry[],
    dataRoomId: string,
    parentId: string | null,
  ): Promise<void> => {
    for (const entry of entries) {
      if (entry.type === 'folder') {
        const created = await nodes.createFolder(owner.id, dataRoomId, {
          name: entry.name,
          parentId,
        });
        folderCount += 1;
        await buildTree(entry.children, dataRoomId, created.id);
        continue;
      }

      await files.importFile({
        userId: owner.id,
        dataRoomId,
        parentId,
        name: entry.name,
        bytes: createPdf({
          title: entry.name.replace(/\.pdf$/i, ''),
          subtitle: entry.subtitle,
          body: entry.body,
        }),
      });
      fileCount += 1;
    }
  };

  const atlas = await dataRooms.create(owner.id, {
    name: DEMO_ROOM.name,
    description: DEMO_ROOM.description,
  });
  await buildTree(DEMO_ROOM.tree, atlas.id, null);

  const helios = await dataRooms.create(owner.id, {
    name: ARCHIVE_ROOM.name,
    description: ARCHIVE_ROOM.description,
  });
  await buildTree(ARCHIVE_ROOM.tree, helios.id, null);

  await seedSecondVersion({ prisma, files, storage, userId: owner.id, dataRoomId: atlas.id });

  console.log('');
  console.log('Seed complete.');
  console.log(`  Data rooms : ${DEMO_ROOM.name}, ${ARCHIVE_ROOM.name}`);
  console.log(`  Folders    : ${folderCount}`);
  console.log(`  Documents  : ${fileCount} (one with two versions)`);
  console.log('');
  console.log('  Sign in as:');
  console.log(`    owner  ${OWNER.email} / ${DEMO_PASSWORD}   (owns both data rooms)`);
  console.log(`    viewer ${VIEWER.email} / ${DEMO_PASSWORD}   (sees nothing until shared)`);
  console.log(`  Viewer account id: ${viewer.id}`);

  await app.close();
}

async function reset(prisma: PrismaService, storage: StorageService): Promise<void> {
  const demoUsers = await prisma.user.findMany({
    where: { email: { in: [OWNER.email, VIEWER.email] } },
    select: { id: true },
  });

  if (demoUsers.length === 0) return;

  const ownerIds = demoUsers.map((user) => user.id);

  const staleObjects = await prisma.fileVersion.findMany({
    where: { node: { dataRoom: { ownerId: { in: ownerIds } } } },
    select: { storageKey: true },
  });

  await prisma.dataRoom.deleteMany({ where: { ownerId: { in: ownerIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });

  if (staleObjects.length > 0) {
    await storage.removeObjects(staleObjects.map((object) => object.storageKey));
  }

  console.log(`Removed ${demoUsers.length} existing demo account(s) and their content.`);
}

async function seedSecondVersion({
  prisma,
  files,
  storage,
  userId,
  dataRoomId,
}: {
  prisma: PrismaService;
  files: FilesService;
  storage: StorageService;
  userId: string;
  dataRoomId: string;
}): Promise<void> {
  const target = await prisma.node.findFirst({
    where: { dataRoomId, name: 'Management Accounts Q1 FY2026.pdf', deletedAt: null },
    select: { id: true, parentId: true, name: true },
  });

  if (!target) return;

  const reservation = await files.initUpload(userId, dataRoomId, {
    name: target.name,
    parentId: target.parentId,
    mimeType: 'application/pdf',
    sizeBytes: 1,
    conflictStrategy: 'VERSION',
  });

  const bytes = createPdf({
    title: 'Management Accounts Q1 FY2026',
    subtitle: 'Revised 04 April 2026 — restated deferred revenue',
    body: [
      'Quarter ended 31 March 2026 (revised)',
      '',
      'Revenue                        GBP 3.39m   (+22% YoY)',
      'Net revenue retention          112%',
      'Headcount                      74',
      '',
      'Revision note: GBP 51k reclassified from recognised to deferred revenue',
      'following a review of two annual contracts billed in March.',
    ],
  });

  await storage.putObject(reservation.storageKey, bytes, 'application/pdf');
  await files.completeUpload(userId, reservation.versionId);
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
