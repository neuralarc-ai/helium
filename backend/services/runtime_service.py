from typing import Optional, Dict, Any
from services.supabase import DBConnection
from utils.logger import logger
import time
from datetime import datetime, timezone, timedelta


class RuntimeService:
    def __init__(self, db_connection: DBConnection):
        self._db = db_connection

    async def start_agent_run(self, thread_id: str, agent_id: str) -> str:
        """Start a new agent run and return the run ID"""
        try:
            client = await self._db.client
            
            # Create new agent run
            result = await client.table('agent_runs').insert({
                'thread_id': thread_id,
                'status': 'running',
                'started_at': datetime.now(timezone.utc).isoformat(),
                'total_runtime_ms': 0,
                'last_heartbeat': datetime.now(timezone.utc).isoformat()
            }).execute()
            
            if result.data:
                run_id = result.data[0]['id']
                logger.info(f"Started agent run: {run_id} for thread: {thread_id}")
                return run_id
            else:
                raise Exception("Failed to create agent run")
                
        except Exception as e:
            logger.error(f"Error starting agent run: {e}")
            raise

    async def update_heartbeat(self, run_id: str) -> None:
        """Update the heartbeat for an active agent run"""
        try:
            client = await self._db.client
            
            # Update heartbeat and calculate current runtime
            result = await client.table('agent_runs').update({
                'last_heartbeat': datetime.now(timezone.utc).isoformat(),
                'total_runtime_ms': client.rpc('calculate_runtime_ms', {'run_id': run_id}).execute()
            }).eq('id', run_id).execute()
            
            if not result.data:
                logger.warning(f"No agent run found for heartbeat update: {run_id}")
                
        except Exception as e:
            logger.error(f"Error updating heartbeat for run {run_id}: {e}")

    async def complete_agent_run(self, run_id: str, status: str = 'completed', error: Optional[str] = None) -> None:
        """Complete an agent run and calculate final runtime"""
        try:
            client = await self._db.client
            
            # Calculate final runtime and mark as completed
            result = await client.table('agent_runs').update({
                'status': status,
                'completed_at': datetime.now(timezone.utc).isoformat(),
                'total_runtime_ms': client.rpc('calculate_runtime_ms', {'run_id': run_id}).execute(),
                'error': error
            }).eq('id', run_id).execute()
            
            if result.data:
                final_runtime = result.data[0].get('total_runtime_ms', 0)
                logger.info(f"Completed agent run: {run_id} with runtime: {final_runtime}ms")
            else:
                logger.warning(f"No agent run found for completion: {run_id}")
                
        except Exception as e:
            logger.error(f"Error completing agent run {run_id}: {e}")

    async def get_agent_runtime(self, run_id: str) -> Optional[int]:
        """Get the current runtime for an agent run in milliseconds"""
        try:
            client = await self._db.client
            
            result = await client.table('agent_runs').select(
                'total_runtime_ms', 'started_at', 'completed_at', 'status'
            ).eq('id', run_id).single().execute()
            
            if result.data:
                run_data = result.data
                if run_data['status'] == 'running':
                    # Calculate current runtime for running agents
                    started_at = datetime.fromisoformat(run_data['started_at'].replace('Z', '+00:00'))
                    current_time = datetime.now(timezone.utc)
                    runtime_ms = int((current_time - started_at).total_seconds() * 1000)
                    return runtime_ms
                else:
                    # Return stored runtime for completed agents
                    return run_data.get('total_runtime_ms', 0)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting agent runtime for {run_id}: {e}")
            return None

    async def get_thread_total_runtime(self, thread_id: str) -> int:
        """Get the total accumulated runtime for all agent runs in a thread"""
        try:
            client = await self._db.client
            
            result = await client.table('agent_runs').select(
                'total_runtime_ms', 'started_at', 'status'
            ).eq('thread_id', thread_id).execute()
            
            total_runtime = 0
            current_time = datetime.now(timezone.utc)
            
            for run in result.data:
                if run['status'] == 'running':
                    # Calculate current runtime for running agents
                    started_at = datetime.fromisoformat(run['started_at'].replace('Z', '+00:00'))
                    runtime_ms = int((current_time - started_at).total_seconds() * 1000)
                    total_runtime += runtime_ms
                else:
                    # Add stored runtime for completed agents
                    total_runtime += run.get('total_runtime_ms', 0)
            
            return total_runtime
            
        except Exception as e:
            logger.error(f"Error getting thread total runtime for {thread_id}: {e}")
            return 0

    async def cleanup_old_runs(self, days: int = 30) -> int:
        """Clean up old completed agent runs"""
        try:
            client = await self._db.client
            
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            result = await client.table('agent_runs').delete().lt(
                'created_at', cutoff_date.isoformat()
            ).eq('status', 'completed').execute()
            
            deleted_count = len(result.data) if result.data else 0
            logger.info(f"Cleaned up {deleted_count} old agent runs")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old agent runs: {e}")
            return 0

