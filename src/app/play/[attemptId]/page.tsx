import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import Player from '@/components/Player';
import { getProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PlayPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  const { attemptId } = await params;

  return (
    <>
      <Nav profile={profile} />
      <main className="flex-1">
        <Player attemptId={attemptId} />
      </main>
    </>
  );
}
