import { create } from 'zustand';

interface AgentSelectionState {
  selectedAgentId: string | null;
  setSelectedAgentId: (agentId: string | null) => void;
  clearSelectedAgent: () => void;
}

export const useAgentSelection = create<AgentSelectionState>((set) => ({
  selectedAgentId: null,
  setSelectedAgentId: (agentId) => set({ selectedAgentId: agentId }),
  clearSelectedAgent: () => set({ selectedAgentId: null }),
}));
