import { redirect } from 'next/navigation';
import Nav from '@/components/Nav';
import Debrief from '@/components/Debrief';
import { getProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DebriefPage({
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
        <Debrief attemptId={attemptId} />
      </main>
    </>
  );
}
