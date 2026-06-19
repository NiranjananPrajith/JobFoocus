import { createClient } from '@/lib/supabase-utils/server';
import { redirect } from 'next/navigation';
import Card from '@/components/design/Card';
import InsiderRequestForm from './InsiderRequestForm';

export const metadata = {
  title: 'Insider Testing Request — JobFoocus',
};

export default async function InsiderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Middleware handles the redirect for unauthenticated users,
  // but guard here too for type safety.
  if (!user) redirect('/login?next=/insider');

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[480px] mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <p
            className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-4"
            style={{ color: 'var(--primary)' }}
          >
            Insider Program
          </p>
          <h1 className="text-[28px] font-semibold text-ink mb-3 leading-tight">
            Request an Insider Testing Account
          </h1>
          <p className="text-[14px] text-steel leading-relaxed">
            Get free access to Pro-tier features as an insider tester.
            Fill in the details below and we will review your request within 24–48 hours.
          </p>
        </div>

        {/* Form Card */}
        <Card variant="cream">
          <InsiderRequestForm defaultEmail={user.email || ''} />
        </Card>
      </div>
    </div>
  );
}
