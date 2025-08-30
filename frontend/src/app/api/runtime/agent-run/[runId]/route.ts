import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// UUID validation function
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const body = await request.json();
    const { status, total_runtime_ms, error } = body;
    
    console.log('Heartbeat update request:', { runId, status, total_runtime_ms, error });
    
    if (!runId) {
      console.error('Missing runId in request');
      return NextResponse.json(
        { error: 'Run ID is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(runId)) {
      console.error('Invalid runId format:', runId);
      return NextResponse.json(
        { error: 'Invalid Run ID format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    console.log('Supabase client created successfully');

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Verify the agent_runs table exists and is accessible
    const { data: tableCheck, error: tableError } = await supabase
      .from('agent_runs')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('Table access error:', tableError);
      return NextResponse.json(
        { error: 'Database table not accessible', details: tableError.message },
        { status: 500 }
      );
    }

    console.log('Table access verified');

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

    console.log('Update data:', updateData);

    // Check if the agent run exists before updating
    const { data: existingRun, error: selectError } = await supabase
      .from('agent_runs')
      .select('id, thread_id, status')
      .eq('id', runId)
      .single();

    if (selectError) {
      console.error('Error checking existing agent run:', selectError);
      return NextResponse.json(
        { error: 'Agent run not found', details: selectError.message },
        { status: 404 }
      );
    }

    console.log('Found existing agent run:', existingRun);

    const { data, error: updateError } = await supabase
      .from('agent_runs')
      .update(updateData)
      .eq('id', runId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      console.error('Error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      return NextResponse.json(
        { error: 'Failed to update agent run', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('Database update successful:', data);

    return NextResponse.json({
      run_id: runId,
      status: data.status,
      total_runtime_ms: data.total_runtime_ms,
      completed_at: data.completed_at
    });

  } catch (error) {
    console.error('Runtime update API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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

    if (!isValidUUID(runId)) {
      console.error('Invalid runId format:', runId);
      return NextResponse.json(
        { error: 'Invalid Run ID format' },
        { status: 400 }
      );
    }

    if (!isValidUUID(thread_id)) {
      console.error('Invalid thread_id format:', thread_id);
      return NextResponse.json(
        { error: 'Invalid Thread ID format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('User authenticated for agent run creation:', user.id);

    // Verify the agent_runs table exists and is accessible
    const { data: tableCheck, error: tableError } = await supabase
      .from('agent_runs')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('Table access error:', tableError);
      return NextResponse.json(
        { error: 'Database table not accessible', details: tableError.message },
        { status: 500 }
      );
    }

    console.log('Table access verified for creation');

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
