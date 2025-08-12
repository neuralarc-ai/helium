import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    
    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get all agent runs for this thread
    const { data: agentRuns, error } = await supabase
      .from('agent_runs')
      .select('total_runtime_ms, started_at, status, completed_at')
      .eq('thread_id', threadId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch runtime data' },
        { status: 500 }
      );
    }

    // Calculate total runtime
    let totalRuntimeMs = 0;
    const currentTime = new Date();

    for (const run of agentRuns || []) {
      if (run.status === 'running') {
        // For running agents, calculate current runtime
        const startedAt = new Date(run.started_at);
        const runtimeMs = currentTime.getTime() - startedAt.getTime();
        totalRuntimeMs += runtimeMs;
      } else {
        // For completed agents, use stored runtime
        totalRuntimeMs += run.total_runtime_ms || 0;
      }
    }

    return NextResponse.json({
      thread_id: threadId,
      total_runtime_ms: totalRuntimeMs,
      agent_runs: agentRuns?.length || 0
    });

  } catch (error) {
    console.error('Runtime API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
