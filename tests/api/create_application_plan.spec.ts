import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/functions/create_application_plan/route';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateApplicationPlan } from '@/lib/ai/applicationManager';
import { createApplicationWithPlan } from '@/lib/data/applications';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ai/applicationManager', () => ({ generateApplicationPlan: vi.fn() }));
vi.mock('@/lib/data/applications', () => ({ createApplicationWithPlan: vi.fn() }));

describe('create_application_plan API route', () => {
  const supabaseStub: any = {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    // Reset mocks
    (createClient as any).mockResolvedValue(supabaseStub);
    supabaseStub.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    supabaseStub.maybeSingle.mockResolvedValue({ data: null, error: null });
    (generateApplicationPlan as any).mockResolvedValue({ plan: { checklist: [], timeline: [] }, previousResponseId: null });
    (createApplicationWithPlan as any).mockResolvedValue({ success: true, applicationId: 'app123' });
  });

  it('returns 400 if recommendation_id is missing', async () => {
    const req = {
      json: async () => ({}),
    } as Partial<NextRequest> as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 if unauthenticated', async () => {
    const req = {
      json: async () => ({ recommendation_id: 'rec1' }),
    } as Partial<NextRequest> as NextRequest;
    supabaseStub.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns success JSON on valid request', async () => {
    const req = {
      json: async () => ({ recommendation_id: 'rec1' }),
    } as Partial<NextRequest> as NextRequest;
    // Authenticated
    supabaseStub.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user1' } } }, error: null });
    // Sequence of maybeSingle calls:
    // 1st for recommendation_files
    supabaseStub.maybeSingle
      .mockResolvedValueOnce({ data: { file_id: 'pfid' }, error: null })
      // 2nd for profiles (sel profile_file_id and vector_store_id)
      .mockResolvedValueOnce({ data: { profile_file_id: 'profid', vector_store_id: 'vid' }, error: null })
      // 3rd for raw profile select '*'
      .mockResolvedValueOnce({ data: { id: 'user1', name: 'Test' }, error: null })
      // 4th for recommendations table
      .mockResolvedValueOnce({ data: { program_id: 'prid' }, error: null })
      // 5th for programs table
      .mockResolvedValueOnce({ data: { id: 'prid', title: 'Prog' }, error: null });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.application_id).toBe('app123');
    expect(json.previous_response_id).toBeNull();
  });
}); 