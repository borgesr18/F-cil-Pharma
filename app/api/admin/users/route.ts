import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

async function requireAdmin() {
	const supabase = createServerSupabase();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return { ok: false as const, status: 401 };
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('user_id', user.id)
		.maybeSingle();
	if (!profile || profile.role !== 'admin') return { ok: false as const, status: 403 };
	return { ok: true as const };
}

export async function GET(req: NextRequest) {
	const guard = await requireAdmin();
	if (!guard.ok) return NextResponse.json({ error: 'Forbidden' }, { status: guard.status });

	const { searchParams } = new URL(req.url);
	const page = Number(searchParams.get('page') ?? '1');
	const perPage = Number(searchParams.get('perPage') ?? '200');

	const admin = createAdminClient();
	const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });

	return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
	const guard = await requireAdmin();
	if (!guard.ok) return NextResponse.json({ error: 'Forbidden' }, { status: guard.status });

	const body = await req.json();
	const { email, password, email_confirm } = body ?? {};
	if (!email || !password) {
		return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
	}

	const admin = createAdminClient();
	const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: !!email_confirm });
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });

	return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
	const guard = await requireAdmin();
	if (!guard.ok) return NextResponse.json({ error: 'Forbidden' }, { status: guard.status });

	const { searchParams } = new URL(req.url);
	const userId = searchParams.get('userId');
	if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

	const admin = createAdminClient();

	// Delete profile first (idempotent)
	await admin.from('profiles').delete().eq('user_id', userId);

	const { error } = await admin.auth.admin.deleteUser(userId);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });

	return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest) {
	const guard = await requireAdmin();
	if (!guard.ok) return NextResponse.json({ error: 'Forbidden' }, { status: guard.status });

	const body = await req.json();
	const { userId, password } = body ?? {};
	if (!userId || !password) {
		return NextResponse.json({ error: 'userId and password are required' }, { status: 400 });
	}

	const admin = createAdminClient();
	const { data, error } = await admin.auth.admin.updateUserById(userId, { password });
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });

	return NextResponse.json({ user: data.user });
}

