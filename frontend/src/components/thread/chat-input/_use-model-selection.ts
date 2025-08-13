'use client';

import { useSubscription } from '@/hooks/react-query/subscriptions/use-subscriptions';
import { useState, useEffect, useMemo } from 'react';
import { isLocalMode } from '@/lib/config';
import { useAvailableModels } from '@/hooks/react-query/subscriptions/use-model';

export const STORAGE_KEY_MODEL = 'suna-preferred-model-v3';
export const STORAGE_KEY_CUSTOM_MODELS = 'customModels';
export const DEFAULT_PREMIUM_MODEL_ID = 'openrouter/z-ai/glm-4.5-air:free';
// export const DEFAULT_FREE_MODEL_ID = 'moonshotai/kimi-k2';
export const DEFAULT_FREE_MODEL_ID = 'openrouter/z-ai/glm-4.5-air:free';

export type SubscriptionStatus = 'no_subscription' | 'active';

export interface ModelOption {
  id: string;
  label: string;
  requiresSubscription: boolean;
  description?: string;
  top?: boolean;
  isCustom?: boolean;
  priority?: number;
}

export interface CustomModel {
  id: string;
  label: string;
}

// SINGLE SOURCE OF TRUTH for all model data - aligned with backend constants
export const MODELS = {
  // Free tier models (available to all users)
  // 'claude-sonnet-4': { 
  //   tier: 'free',
  //   priority: 100, 
  //   recommended: true,
  //   lowQuality: false
  // },
  // 'gemini-flash-2.5': { 
  //   tier: 'free', 
  //   priority: 70,
  //   recommended: false,
  //   lowQuality: false
  // },
  // 'qwen3': { 
  //   tier: 'free', 
  //   priority: 60,
  //   recommended: false,
  //   lowQuality: false
  // },

  // Premium/Paid tier models (require subscription) - except specific free models
  'moonshot/moonshot-v1-8k': { 
    tier: 'free', 
    priority: 99,
    recommended: false,
    lowQuality: false
  },
  'moonshot/kimi-k2-0711-preview': { 
    tier: 'free', 
    priority: 98,
    recommended: false,
    lowQuality: false
  },
  'moonshot/kimi-k2-turbo-preview': { 
    tier: 'free', 
    priority: 97,
    recommended: false,
    lowQuality: false
  },
  'openrouter/z-ai/glm-4.5-air:free': { 
    tier: 'free', 
    priority: 97,
    recommended: false,
    lowQuality: false
  },
  
  // AWS Bedrock Models
  'bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0': { 
    tier: 'free', 
    priority: 95,
    recommended: true,
    lowQuality: false
  },
  'bedrock/anthropic.claude-sonnet-4-20250514-v1:0': { 
    tier: 'free', 
    priority: 96,
    recommended: true,
    lowQuality: false
  },
  'bedrock/meta.llama4-scout-17b-instruct-v1:0': { 
    tier: 'free', 
    priority: 90,
    recommended: false,
    lowQuality: false
  },
  'bedrock/meta.llama4-maverick-17b-instruct-v1:0': { 
    tier: 'free', 
    priority: 92,
    recommended: false,
    lowQuality: false
  },
  'bedrock/deepseek.r1-v1:0': { 
    tier: 'free', 
    priority: 88,
    recommended: false,
    lowQuality: false
  },
  
  // 'grok-4': { 
  //   tier: 'premium', 
  //   priority: 98,
  //   recommended: false,
  //   lowQuality: false
  // },
  // 'sonnet-3.7': { 
  //   tier: 'premium', 
  //   priority: 97, 
  //   recommended: false,
  //   lowQuality: false
  // },
  // 'google/gemini-2.5-pro': { 
  //   tier: 'premium', 
  //   priority: 96,
  //   recommended: false,
  //   lowQuality: false
  // },
  // 'gpt-4.1': { 
  //   tier: 'premium', 
  //   priority: 96,
  //   recommended: false,
  //   lowQuality: false
  // },
  // 'sonnet-3.5': { 
  //   tier: 'premium', 
  //   priority: 90,
  //   recommended: false,
  //   lowQuality: false
  // },
  // 'gpt-4o': { 
  //   tier: 'premium', 
  //   priority: 88,
  //   recommended: false,
  //   lowQuality: false
  // },
  // 'gemini-2.5-flash:thinking': { 
  //   tier: 'premium', 
  //   priority: 84,
  //   recommended: false,
  //   lowQuality: false
  // },
  'openrouter/deepseek/deepseek-chat-v3-0324:free': { 
    tier: 'free', 
    priority: 96,
    recommended: false,
    lowQuality: false
  },
  
  // Z.AI GLM Models from OpenRouter
  'openrouter/z-ai/glm-4.5v': { 
    tier: 'free', 
    priority: 95,
    recommended: true,
    lowQuality: false,
    features: ['vision', 'multimodal', 'reasoning']
  },
  'openrouter/z-ai/glm-4.5': { 
    tier: 'free', 
    priority: 96,
    recommended: true,
    lowQuality: false,
    features: ['reasoning', 'code-generation', '128k-context']
  },
  'openrouter/z-ai/glm-4.5-air': { 
    tier: 'free', 
    priority: 94,
    recommended: true,
    lowQuality: false,
    features: ['lightweight', 'real-time', 'cost-effective']
  },
  'openrouter/z-ai/glm-4-32b': { 
    tier: 'free', 
    priority: 92,
    recommended: false,
    lowQuality: false,
    features: ['cost-effective', 'tool-use']
  },
  
  // Mistral Models from OpenRouter
  'openrouter/mistralai/mistral-small-3.2-24b-instruct': { 
    tier: 'free', 
    priority: 93,
    recommended: true,
    lowQuality: false,
    features: ['instruction-following', 'function-calling', 'coding', 'stem', 'vision', 'structured-output', '131k-context']
  }
};

// Add model descriptions for better user experience
export const MODEL_DESCRIPTIONS = {
  'openrouter/z-ai/glm-4.5v': 'Vision-language model with multimodal capabilities, perfect for image analysis and complex reasoning tasks',
  'openrouter/z-ai/glm-4.5': 'Flagship model optimized for agent applications with 128K context and advanced reasoning',
  'openrouter/z-ai/glm-4.5-air': 'Lightweight variant offering fast responses and cost-effective reasoning capabilities',
  'openrouter/z-ai/glm-4-32b': 'Cost-effective model with strong tool use and code generation abilities',
  'openrouter/mistralai/mistral-small-3.2-24b-instruct': 'High-performance 24B model with strong coding, STEM, and vision capabilities, optimized for instruction following and function calling',
  // ... other models ...
};

// Production-only models for Helio branding
export const PRODUCTION_MODELS = {
  'helio-o1': {
    id: 'bedrock/anthropic.claude-sonnet-4-20250514-v1:0',
    label: 'Helio o1',
    description: 'Our most powerful model for complex tasks',
    tier: 'free',
    priority: 100,
    recommended: false,
    lowQuality: false
  },
  'helio-k1': {
    id: 'moonshot/kimi-k2-turbo-preview',
    label: 'Helio k1',
    description: 'Great for deep analysis',
    tier: 'free',
    priority: 90,
    recommended: false,
    lowQuality: false
  },
  'helio-g1': {
    id: 'openrouter/z-ai/glm-4.5',
    label: 'Helio g1',
    description: 'Great for coding and dashboard',
    tier: 'free',
    priority: 80,
    recommended: false,
    lowQuality: false
  },
  'helio-t1': {
    id: 'openrouter/qwen/qwen3-235b-a22b:free',
    label: 'Helio t1',
    description: 'Our thinking model',
    tier: 'free',
    priority: 70,
    recommended: false,
    lowQuality: false
  },
  
  // Add Z.AI models as premium options
  // 'helio-vision': {
  //   id: 'openrouter/z-ai/glm-4.5v',
  //   label: 'Helio Vision',
  //   description: 'Multimodal AI with vision capabilities for image analysis and complex reasoning',
  //   tier: 'free',
  //   priority: 95,
  //   recommended: true,
  //   lowQuality: false
  // },
  // 'helio-reasoning': {
  //   id: 'openrouter/z-ai/glm-4.5',
  //   label: 'Helio Reasoning',
  //   description: 'Advanced reasoning model with 128K context for complex agent tasks',
  //   tier: 'free',
  //   priority: 96,
  //   recommended: true,
  //   lowQuality: false
  // },
  // 'helio-fast': {
  //   id: 'openrouter/z-ai/glm-4.5-air',
  //   label: 'Helio Fast',
  //   description: 'Lightweight model for quick responses and cost-effective reasoning',
  //   tier: 'free',
  //   priority: 94,
  //   recommended: false,
  //   lowQuality: false
  // },
  
  // Add Mistral model as premium option
  'helio-m1': {
    id: 'openrouter/mistralai/mistral-small-3.2-24b-instruct',
    label: 'Helio m1',
    description: 'High-performance model with strong coding, STEM, and vision capabilities',
    tier: 'free',
    priority: 60,
    recommended: true,
    lowQuality: false
  }
};

// Model tags for categorization and search
export const MODEL_TAGS = {
  'openrouter/z-ai/glm-4.5v': ['vision', 'multimodal', 'reasoning', 'agent-focused', 'z-ai'],
  'openrouter/z-ai/glm-4.5': ['reasoning', 'code-generation', 'agent-alignment', '128k-context', 'z-ai'],
  'openrouter/z-ai/glm-4.5-air': ['lightweight', 'reasoning', 'real-time', 'cost-effective', 'z-ai'],
  'openrouter/z-ai/glm-4-32b': ['cost-effective', 'tool-use', 'online-search', 'code-tasks', 'z-ai'],
  'openrouter/mistralai/mistral-small-3.2-24b-instruct': ['instruction-following', 'function-calling', 'coding', 'stem', 'vision', 'structured-output', '131k-context', 'mistral'],
  // ... other models ...
};

// Helper to check if a user can access a model based on subscription status
export const canAccessModel = (
  subscriptionStatus: SubscriptionStatus,
  requiresSubscription: boolean,
): boolean => {
  if (isLocalMode()) {
    return true;
  }
  return subscriptionStatus === 'active' || !requiresSubscription;
};

// Helper to format a model name for display
export const formatModelName = (name: string): string => {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Add openrouter/ prefix to custom models
export const getPrefixedModelId = (modelId: string, isCustom: boolean): string => {
  if (isCustom && !modelId.startsWith('openrouter/')) {
    return `openrouter/${modelId}`;
  }
  return modelId;
};

// Helper to get custom models from localStorage
export const getCustomModels = (): CustomModel[] => {
  if (!isLocalMode() || typeof window === 'undefined') return [];
  
  try {
    const storedModels = localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS);
    if (!storedModels) return [];
    
    const parsedModels = JSON.parse(storedModels);
    if (!Array.isArray(parsedModels)) return [];
    
    return parsedModels
      .filter((model: any) => 
        model && typeof model === 'object' && 
        typeof model.id === 'string' && 
        typeof model.label === 'string');
  } catch (e) {
    console.error('Error parsing custom models:', e);
    return [];
  }
};

// Helper to save model preference to localStorage safely
const saveModelPreference = (modelId: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY_MODEL, modelId);
  } catch (error) {
    console.warn('Failed to save model preference to localStorage:', error);
  }
};

export const useModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_FREE_MODEL_ID);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const { data: subscriptionData } = useSubscription();
  const { data: modelsData, isLoading: isLoadingModels } = useAvailableModels({
    refetchOnMount: false,
  });
  
  const subscriptionStatus: SubscriptionStatus = subscriptionData?.status === 'active' 
    ? 'active' 
    : 'no_subscription';

  // Function to refresh custom models from localStorage
  const refreshCustomModels = () => {
    if (isLocalMode() && typeof window !== 'undefined') {
      const freshCustomModels = getCustomModels();
      setCustomModels(freshCustomModels);
    }
  };

  // Load custom models from localStorage
  useEffect(() => {
    refreshCustomModels();
  }, []);

  // Generate model options list with consistent structure
  const MODEL_OPTIONS = useMemo(() => {
    let models = [];
    
    // In production, only show the two Helio models
    if (!isLocalMode()) {
      models = Object.values(PRODUCTION_MODELS).map(model => ({
        id: model.id,
        label: model.label,
        description: model.description,
        requiresSubscription: false,
        top: model.recommended,
        priority: model.priority,
        lowQuality: model.lowQuality,
        recommended: model.recommended
      }));
    } else {
      // Default models if API data not available
      if (!modelsData?.models || isLoadingModels) {
        models = [
          { 
            id: DEFAULT_FREE_MODEL_ID, 
            label: 'GLM 4.5', 
            requiresSubscription: false,
            priority: MODELS[DEFAULT_FREE_MODEL_ID]?.priority || 50
          },
          { 
            id: DEFAULT_PREMIUM_MODEL_ID, 
            label: 'Sonnet 4', 
            requiresSubscription: false, 
            priority: MODELS[DEFAULT_PREMIUM_MODEL_ID]?.priority || 100
          },
        ];
      } else {
        // Process API-provided models
        const processedModelIds = new Set(); // Track processed models to avoid duplicates
        models = modelsData.models
          .filter(model => {
            const shortName = model.short_name || model.id;
            // Skip if we've already processed this model ID
            if (processedModelIds.has(shortName)) {
              return false;
            }
            processedModelIds.add(shortName);
            return true;
          })
          .map(model => {
            const shortName = model.short_name || model.id;
            const displayName = model.display_name || shortName;
            
            // Format the display label
            let cleanLabel = displayName;
            if (cleanLabel.includes('/')) {
              cleanLabel = cleanLabel.split('/').pop() || cleanLabel;
            }
            
            cleanLabel = cleanLabel
              .replace(/-/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            
            // Get model data from our central MODELS constant
            const modelData = MODELS[shortName] || {};
            const isPremium = model?.requires_subscription || modelData.tier === 'premium' || false;
            
            return {
              id: shortName,
              label: cleanLabel,
              requiresSubscription: isPremium,
              top: modelData.priority >= 90, // Mark high-priority models as "top"
              priority: modelData.priority || 0,
              lowQuality: modelData.lowQuality || false,
              recommended: modelData.recommended || false
            };
          });
      }
      
      // Add custom models if in local mode
      if (customModels.length > 0) {
        const customModelOptions = customModels.map(model => ({
          id: model.id,
          label: model.label || formatModelName(model.id),
          requiresSubscription: false,
          top: false,
          isCustom: true,
          priority: 30, // Low priority by default
          lowQuality: false,
          recommended: false
        }));
        
        models = [...models, ...customModelOptions];
      }
    }
    
    // Sort models consistently in one place:
    // 1. First by recommended (recommended first)
    // 2. Then by priority (higher first)
    // 3. Finally by name (alphabetical)
    const sortedModels = models.sort((a, b) => {
      // First by recommended status
      if (a.recommended !== b.recommended) {
        return a.recommended ? -1 : 1;
      }

      // Then by priority (higher first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Finally by name
      return a.label.localeCompare(b.label);
    });
    return sortedModels;
  }, [modelsData, isLoadingModels, customModels]);

  // Get filtered list of models the user can access (no additional sorting)
  const availableModels = useMemo(() => {
    // In production, all models are available (they're all free)
    if (!isLocalMode()) {
      return MODEL_OPTIONS;
    }
    
    // In local mode, filter based on subscription status
    return MODEL_OPTIONS.filter(model => 
      canAccessModel(subscriptionStatus, model.requiresSubscription)
    );
  }, [MODEL_OPTIONS, subscriptionStatus]);

  // Initialize selected model from localStorage ONLY ONCE
  useEffect(() => {
    if (typeof window === 'undefined' || hasInitialized) return;
    
    console.log('Initializing model selection from localStorage...');
    
    try {
      const savedModel = localStorage.getItem(STORAGE_KEY_MODEL);
      console.log('Saved model from localStorage:', savedModel);
      
      // If we have a saved model, validate it's still available and accessible
      if (savedModel) {
        // Wait for models to load before validating
        if (isLoadingModels) {
          console.log('Models still loading, waiting...');
          return;
        }
        
        const modelOption = MODEL_OPTIONS.find(option => option.id === savedModel);
        const isCustomModel = isLocalMode() && customModels.some(model => model.id === savedModel);
        
        // Check if saved model is still valid and accessible
        if (modelOption || isCustomModel) {
          const isAccessible = isLocalMode() || 
            canAccessModel(subscriptionStatus, modelOption?.requiresSubscription ?? false);
          
          if (isAccessible) {
            console.log('Using saved model:', savedModel);
            setSelectedModel(savedModel);
            setHasInitialized(true);
            return;
          } else {
            console.log('Saved model not accessible, falling back to default');
          }
        } else {
          console.log('Saved model not found in available models, falling back to default');
        }
      }
      
      // Fallback to default model based on environment
      let defaultModel: string;
      if (isLocalMode()) {
        // Local mode: use subscription-based default
        defaultModel = subscriptionStatus === 'active' ? DEFAULT_PREMIUM_MODEL_ID : DEFAULT_FREE_MODEL_ID;
      } else {
        // Production mode: use Helio o1 as default
        defaultModel = PRODUCTION_MODELS['helio-o1'].id;
      }
      
      console.log('Using default model:', defaultModel);
      setSelectedModel(defaultModel);
      saveModelPreference(defaultModel);
      setHasInitialized(true);
      
    } catch (error) {
      console.warn('Failed to load preferences from localStorage:', error);
      
      // Fallback to default model based on environment
      let defaultModel: string;
      if (isLocalMode()) {
        // Local mode: use subscription-based default
        defaultModel = subscriptionStatus === 'active' ? DEFAULT_PREMIUM_MODEL_ID : DEFAULT_FREE_MODEL_ID;
      } else {
        // Production mode: use Helio o1 as default
        defaultModel = PRODUCTION_MODELS['helio-o1'].id;
      }
      
      setSelectedModel(defaultModel);
      saveModelPreference(defaultModel);
      setHasInitialized(true);
    }
  }, [subscriptionStatus, MODEL_OPTIONS, isLoadingModels, customModels, hasInitialized]);

  // Handle model selection change
  const handleModelChange = (modelId: string) => {
    console.log('handleModelChange called with:', modelId);
    
    // Refresh custom models from localStorage to ensure we have the latest
    if (isLocalMode()) {
      refreshCustomModels();
    }
    
    // First check if it's a custom model in local mode
    const isCustomModel = isLocalMode() && customModels.some(model => model.id === modelId);
    
    // Then check if it's in standard MODEL_OPTIONS
    const modelOption = MODEL_OPTIONS.find(option => option.id === modelId);
    
    // Check if model exists in either custom models or standard options
    if (!modelOption && !isCustomModel) {
      console.warn('Model not found in options:', modelId, MODEL_OPTIONS, isCustomModel, customModels);
      
      // Reset to default model when the selected model is not found
      let defaultModel: string;
      if (isLocalMode()) {
        // Local mode: use subscription-based default
        defaultModel = subscriptionStatus === 'active' ? DEFAULT_PREMIUM_MODEL_ID : DEFAULT_FREE_MODEL_ID;
      } else {
        // Production mode: use Helio o1 as default
        defaultModel = PRODUCTION_MODELS['helio-o1'].id;
      }
      
      setSelectedModel(defaultModel);
      saveModelPreference(defaultModel);
      return;
    }

    // Check access permissions (except for custom models in local mode)
    if (!isCustomModel && !isLocalMode() && 
        !canAccessModel(subscriptionStatus, modelOption?.requiresSubscription ?? false)) {
      console.warn('Model not accessible:', modelId);
      return;
    }
    
    console.log('Setting selected model and saving to localStorage:', modelId);
    setSelectedModel(modelId);
    saveModelPreference(modelId);
  };

  // Get the actual model ID to send to the backend
  const getActualModelId = (modelId: string): string => {
    // No need for automatic prefixing in most cases - just return as is
    return modelId;
  };

  return {
    selectedModel,
    setSelectedModel: (modelId: string) => {
      handleModelChange(modelId);
    },
    subscriptionStatus,
    availableModels,
    allModels: MODEL_OPTIONS,  // Already pre-sorted
    customModels,
    getActualModelId,
    refreshCustomModels,
    canAccessModel: (modelId: string) => {
      if (isLocalMode()) return true;
      const model = MODEL_OPTIONS.find(m => m.id === modelId);
      return model ? canAccessModel(subscriptionStatus, model.requiresSubscription) : false;
    },
    isSubscriptionRequired: (modelId: string) => {
      return MODEL_OPTIONS.find(m => m.id === modelId)?.requiresSubscription || false;
    }
  };
};

// Export the hook but not any sorting logic - sorting is handled internally