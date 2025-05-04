import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createApplicationWithPlan,
  getApplicationState,
  updateApplicationTask,
} from '@/lib/data/applications';

// Mock uuid to return constant id for tests
vi.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('createApplicationWithPlan', () => {
  const params = {
    userId: 'user1',
    recommendationId: 'rec1',
    profileFileId: 'pf1',
    programFileId: 'pr1',
    plan: { checklist: [], timeline: [] },
  };

  it('returns success and applicationId on successful insert', async () => {
    const supabase = {
      from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }) }),
    } as any;
    const result = await createApplicationWithPlan(supabase, params as any);
    expect(result).toEqual({ success: true, applicationId: 'test-uuid' });
  });

  it('returns error when application insert fails', async () => {
    const supabase = {
      from: () => ({ insert: vi.fn().mockResolvedValue({ error: { message: 'fail' } }) }),
    } as any;
    const result = await createApplicationWithPlan(supabase, params as any);
    expect(result.success).toBe(false);
    expect(result.error).toBe('fail');
  });
});

describe('getApplicationState', () => {
  const appRow = { id: 'app1', timeline: [{ label: 'L1', target_date: '2025-01-01' }] };
  const taskRows = [{ id: 't1', application_id: 'app1', title: 'Task', description: '', due_date: '2025-02-01', status: 'pending', sort_order: 0 }];

  it('returns application and tasks on success', async () => {
    const supabase = {
      from: (table: string) => {
        if (table === 'applications') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: appRow, error: null }) }) }),
          };
        }
        return {
          select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: taskRows, error: null }) }) }),
        };
      },
    } as any;
    const result = await getApplicationState(supabase, 'app1');
    expect(result.success).toBe(true);
    expect(result.application).toEqual(appRow);
    expect(result.tasks).toEqual(taskRows);
  });

  it('returns error when application not found', async () => {
    const supabase = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: new Error('no') }) }) }) }),
    } as any;
    const result = await getApplicationState(supabase, 'app1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('no');
  });
});

describe('updateApplicationTask', () => {
  it('returns success on successful update', async () => {
    const supabase = {
      from: () => ({ update: vi.fn().mockResolvedValue({ error: null }), eq: () => {} }),
    } as any;
    const result = await updateApplicationTask(supabase, 't1', { status: 'done' });
    expect(result.success).toBe(true);
  });

  it('returns error on failed update', async () => {
    const supabase = {
      from: () => ({ update: vi.fn().mockResolvedValue({ error: { message: 'err' } }), eq: () => {} }),
    } as any;
    const result = await updateApplicationTask(supabase, 't1', { status: 'done' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('err');
  });
}); 