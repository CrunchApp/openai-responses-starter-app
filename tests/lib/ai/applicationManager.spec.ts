import { describe, it, expect, beforeEach } from 'vitest';
import { generateApplicationPlan } from '@/lib/ai/applicationManager';

describe('generateApplicationPlan', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('returns a stub plan with 2 checklist and 2 timeline items when OPENAI_API_KEY is not set', async () => {
    const result = await generateApplicationPlan({
      profileFileId: 'pfid',
      programFileId: 'prid',
      vectorStoreId: 'vid',
      supabase: {} as any,
      rawProfile: {},
      rawProgram: {},
    });
    expect(result.previousResponseId).toBeNull();
    expect(result.plan.checklist).toHaveLength(2);
    expect(result.plan.timeline).toHaveLength(2);
  });
}); 