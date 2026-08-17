import { RoomBrowser } from '@/components/nodes/room-browser';

export default async function DataRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <RoomBrowser dataRoomId={roomId} folderId={null} />;
}
