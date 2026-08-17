import { RoomBrowser } from '@/components/nodes/room-browser';

export default async function FolderPage({
  params,
}: {
  params: Promise<{ roomId: string; folderId: string }>;
}) {
  const { roomId, folderId } = await params;
  return <RoomBrowser dataRoomId={roomId} folderId={folderId} />;
}
