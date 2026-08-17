import type { Metadata } from 'next';

import { SharedBrowser } from '@/components/shares/shared-browser';

export const metadata: Metadata = {
  title: 'Shared with you',
  robots: { index: false, follow: false },
};

export default async function SharedRootPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedBrowser token={token} folderId={null} />;
}
