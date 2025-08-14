import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const body = await request.json();
    const { status, total_runtime_ms, error } = body;
    
    if (!runId) {
      return NextResponse.json(
        { error: 'Run ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update the agent run
    const updateData: any = {
      status: status || 'completed',
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.total_runtime_ms = total_runtime_ms || 0;
    } else if (status === 'running') {
      updateData.last_heartbeat = new Date().toISOString();
      updateData.total_runtime_ms = total_runtime_ms || 0;
    }

    if (error) {
      updateData.error = error;
    }

    const { data, error: updateError } = await supabase
      .from('agent_runs')
      .update(updateData)
      .eq('id', runId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { 
          error: 'Failed to update agent run',
          details: updateError.message || (updateError as any).hint || (updateError as any).code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      run_id: runId,
      status: data.status,
      total_runtime_ms: data.total_runtime_ms,
      completed_at: data.completed_at
    });

  } catch (error) {
    console.error('Runtime update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const body = await request.json();
    const { thread_id } = body;
    
    if (!runId || !thread_id) {
      return NextResponse.json(
        { error: 'Run ID and Thread ID are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Idempotent create: return existing if present, else create
    const existing = await supabase
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .maybeSingle();

    if (existing.data) {
      return NextResponse.json({
        run_id: runId,
        thread_id: existing.data.thread_id,
        status: existing.data.status,
        started_at: existing.data.started_at
      });
    }

    // Create a new agent run (handle race-condition duplicates gracefully)
    const insertResult = await supabase
      .from('agent_runs')
      .insert({
        id: runId,
        thread_id,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertResult.error) {
      console.error('Database insert error:', insertResult.error);
      // If duplicate key, fetch and return existing row
      const code = (insertResult.error as any)?.code || (insertResult.error as any)?.details;
      if (code === '23505' || String(code).includes('duplicate key')) {
        const fetched = await supabase
          .from('agent_runs')
          .select('*')
          .eq('id', runId)
          .maybeSingle();
        if (fetched.data) {
          return NextResponse.json({
            run_id: runId,
            thread_id: fetched.data.thread_id,
            status: fetched.data.status,
            started_at: fetched.data.started_at
          });
        }
      }
      return NextResponse.json(
        { 
          error: 'Failed to create agent run',
          details: insertResult.error.message || (insertResult.error as any).hint || (insertResult.error as any).code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      run_id: runId,
      thread_id,
      status: insertResult.data.status,
      started_at: insertResult.data.started_at
    });

  } catch (error) {
    console.error('Runtime create API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
