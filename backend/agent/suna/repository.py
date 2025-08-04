from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone
from services.supabase import DBConnection
from utils.logger import logger


@dataclass
class SunaAgentRecord:
    agent_id: str
    account_id: str
    name: str
    current_version_tag: str
    last_sync_date: str
    is_active: bool
    
    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> 'SunaAgentRecord':
        metadata = row.get('metadata', {})
        return cls(
            agent_id=row['agent_id'],
            account_id=row['account_id'],
            name=row['name'],
            current_version_tag=metadata.get('config_version', 'unknown'),
            last_sync_date=metadata.get('last_central_update', ''),
            is_active=True
        )


class SunaAgentRepository:
    def __init__(self, db: DBConnection = None):
        self.db = db or DBConnection()
    
    async def find_all_suna_agents(self) -> List[SunaAgentRecord]:
        try:
            client = await self.db.client
            result = await client.table('agents').select(
                'agent_id, account_id, name, metadata'
            ).eq('metadata->>is_suna_default', 'true').execute()
            
            return [SunaAgentRecord.from_db_row(row) for row in result.data]
            
        except Exception as e:
            logger.error(f"Failed to find Suna agents: {e}")
            raise
    
    async def find_suna_agents_needing_sync(self, target_version_tag: str) -> List[SunaAgentRecord]:
        agents = await self.find_all_suna_agents()
        return [
            agent for agent in agents 
            if agent.current_version_tag != target_version_tag
        ]
    
    async def update_agent_record(
        self, 
        agent_id: str, 
        config_data: Dict[str, Any],
        unified_config: Dict[str, Any]
    ) -> bool:
        try:
            client = await self.db.client
            
            current_agent_result = await client.table('agents').select(
                'configured_mcps, custom_mcps, metadata'
            ).eq('agent_id', agent_id).execute()
            
            if not current_agent_result.data:
                logger.error(f"Agent {agent_id} not found for selective update")
                return False
            
            current_agent = current_agent_result.data[0]
            current_metadata = current_agent.get('metadata', {})

            preserved_configured_mcps = config_data.get('configured_mcps', current_agent.get('configured_mcps', []))
            preserved_custom_mcps = config_data.get('custom_mcps', current_agent.get('custom_mcps', []))

            for i, mcp in enumerate(preserved_custom_mcps):
                tools_count = len(mcp.get('enabledTools', mcp.get('enabled_tools', [])))
                logger.info(f"Agent {agent_id} - Preserving custom MCP {i+1} ({mcp.get('name', 'Unknown')}) with {tools_count} enabled tools")
            
            updated_config = unified_config.copy()
            updated_config['tools']['mcp'] = preserved_configured_mcps
            updated_config['tools']['custom_mcp'] = preserved_custom_mcps
            
            update_data = {
                "config": updated_config,
                "metadata": {
                    **current_metadata,
                    **config_data["metadata"]
                }
            }
            
            preserved_unified_config = {
                'tools': {
                    'mcp': preserved_configured_mcps,
                    'custom_mcp': preserved_custom_mcps,
                    'agentpress': {}
                },
                'metadata': {
                    'is_suna_default': True,
                    'centrally_managed': True
                }
            }
            
            update_data["config"] = preserved_unified_config
            
            result = await client.table('agents').update(update_data).eq('agent_id', agent_id).execute()
            
            logger.info(f"Surgically updated agent {agent_id} - preserved MCPs and customizations")
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Failed to surgically update agent {agent_id}: {e}")
            raise
    
    
    async def update_agent_version_pointer(self, agent_id: str, version_id: str) -> bool:
        try:
            client = await self.db.client
            result = await client.table('agents').update({
                'current_version_id': version_id
            }).eq('agent_id', agent_id).execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Failed to update version pointer for agent {agent_id}: {e}")
            raise
    
    async def get_agent_stats(self) -> Dict[str, Any]:
        try:
            client = await self.db.client
            
            total_result = await client.table('agents').select(
                'agent_id', count='exact'
            ).eq('metadata->>is_suna_default', 'true').execute()
            
            total_count = total_result.count or 0
            
            agents = await self.find_all_suna_agents()
            version_dist = {}
            for agent in agents:
                version = agent.current_version_tag
                version_dist[version] = version_dist.get(version, 0) + 1
            
            return {
                "total_agents": total_count,
                "version_distribution": version_dist,
                "last_updated": max([a.last_sync_date for a in agents], default="unknown")
            }
            
        except Exception as e:
            logger.error(f"Failed to get agent stats: {e}")
            return {"error": str(e)}
    
    async def create_suna_agent_simple(
        self, 
        account_id: str,
    ) -> str:
        try:
            from agent.suna.config import SunaConfig
            
            client = await self.db.client
            
            agent_data = {
                "account_id": account_id,
                "name": SunaConfig.NAME,
                "description": SunaConfig.DESCRIPTION,
                "is_default": True,
                "avatar": SunaConfig.AVATAR,
                "avatar_color": SunaConfig.AVATAR_COLOR,
                "metadata": {
                    "is_suna_default": True,
                    "centrally_managed": True,
                    "installation_date": datetime.now(timezone.utc).isoformat()
                },
                "version_count": 1
            }
            
            result = await client.table('agents').insert(agent_data).execute()
            
            if result.data:
                agent_id = result.data[0]['agent_id']
                logger.info(f"Created minimal Suna agent {agent_id} for {account_id}")
                await self._create_initial_version(
                    agent_id=agent_id,
                    account_id=account_id,
                    system_prompt="[MANAGED]",
                    configured_mcps=SunaConfig.DEFAULT_MCPS,
                    custom_mcps=SunaConfig.DEFAULT_CUSTOM_MCPS,
                    agentpress_tools=SunaConfig.DEFAULT_TOOLS
                )
                return agent_id
            
            raise Exception("No data returned from insert")
            
        except Exception as e:
            logger.error(f"Failed to create Suna agent for {account_id}: {e}")
            raise
    
    async def update_agent_metadata(
        self,
        agent_id: str,
        version_tag: str
    ) -> bool:
        try:
            client = await self.db.client
            
            update_data = {
                "metadata": {
                    "is_suna_default": True,
                    "centrally_managed": True,
                    "config_version": version_tag,
                    "last_central_update": datetime.now(timezone.utc).isoformat()
                }
            }
            
            result = await client.table('agents').update(update_data).eq('agent_id', agent_id).execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Failed to update metadata for agent {agent_id}: {e}")
            raise
    
    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent"""
        try:
            client = await self.db.client
            result = await client.table('agents').delete().eq('agent_id', agent_id).execute()
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Failed to delete agent {agent_id}: {e}")
            raise
    
    async def get_all_personal_accounts(self) -> List[str]:
        try:
            client = await self.db.client
            result = await client.schema('basejump').table('accounts').select(
                'id'
            ).eq('personal_account', True).execute()
            
            return [row['id'] for row in result.data]
            
        except Exception as e:
            logger.error(f"Failed to get personal accounts: {e}")
            raise
    
    async def _create_initial_version(
        self,
        agent_id: str,
        account_id: str,
        system_prompt: str,
        configured_mcps: List[Dict[str, Any]],
        custom_mcps: List[Dict[str, Any]],
        agentpress_tools: Dict[str, Any]
    ) -> None:
        try:
            from agent.versioning.version_service import get_version_service
            
            version_service = await get_version_service()
            await version_service.create_version(
                agent_id=agent_id,
                user_id=account_id,
                system_prompt=system_prompt,
                configured_mcps=configured_mcps,
                custom_mcps=custom_mcps,
                agentpress_tools=agentpress_tools,
                version_name="v1",
                change_description="Initial Suna agent version"
            )
            
            logger.info(f"Created initial version for Suna agent {agent_id}")
            
        except Exception as e:
            logger.error(f"Failed to create initial version for Suna agent {agent_id}: {e}")