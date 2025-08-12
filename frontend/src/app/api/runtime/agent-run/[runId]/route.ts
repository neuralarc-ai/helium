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
        { error: 'Failed to update agent run' },
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

    // Create a new agent run
    const { data, error } = await supabase
      .from('agent_runs')
      .insert({
        id: runId,
        thread_id,
        status: 'running',
        started_at: new Date().toISOString(),
        total_runtime_ms: 0,
        last_heartbeat: new Date().toISOString(),
        metadata: {} // Add empty metadata object
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create agent run' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      run_id: runId,
      thread_id,
      status: data.status,
      started_at: data.started_at
    });

  } catch (error) {
    console.error('Runtime create API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
