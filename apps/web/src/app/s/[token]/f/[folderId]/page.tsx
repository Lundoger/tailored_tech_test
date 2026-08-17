import type { Metadata } from 'next';

import { SharedBrowser } from '@/components/shares/shared-browser';

export const metadata: Metadata = {
  title: 'Shared with you',
  robots: { index: false, follow: false },
};

export default async function SharedFolderPage({
  params,
}: {
  params: Promise<{ token: string; folderId: string }>;
}) {
  const { token, folderId } = await params;
  return <SharedBrowser token={token} folderId={folderId} />;
}
