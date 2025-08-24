'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ImageModel {
  name: string;
  provider: string;
  description: string;
  cost_per_1k_tokens: string;
  features: string[];
  recommended: boolean;
}

interface ImageModelsResponse {
  status: string;
  data: {
    available_models: {
      recommended: Record<string, ImageModel>;
      all: Record<string, ImageModel>;
      defaults: Record<string, string>;
    };
    current_config: {
      generation_model: string;
      edit_model: string;
    };
  };
}

export function ImageModelSelector() {
  const [models, setModels] = useState<ImageModelsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGenerationModel, setSelectedGenerationModel] = useState<string>('');
  const [selectedEditModel, setSelectedEditModel] = useState<string>('');

  useEffect(() => {
    fetchImageModels();
  }, []);

  const fetchImageModels = async () => {
    try {
      const response = await fetch('/api/agents/image-models');
      const data: ImageModelsResponse = await response.json();
      setModels(data.data);
      setSelectedGenerationModel(data.data.current_config.generation_model);
      setSelectedEditModel(data.data.current_config.edit_model);
    } catch (error) {
      console.error('Error fetching image models:', error);
      toast.error('Failed to fetch image models');
    } finally {
      setLoading(false);
    }
  };

  const updateModels = async () => {
    try {
      const response = await fetch('/api/agents/image-models/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generation_model: selectedGenerationModel,
          edit_model: selectedEditModel,
        }),
      });

      if (response.ok) {
        toast.success('Image models updated successfully');
        await fetchImageModels(); // Refresh the data
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update image models');
      }
    } catch (error) {
      console.error('Error updating image models:', error);
      toast.error('Failed to update image models');
    }
  };

  if (loading) {
    return <div>Loading image models...</div>;
  }

  if (!models) {
    return <div>Failed to load image models</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image Generation Models</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure cost-effective image generation models using OpenRouter
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Generation Model</label>
              <Select value={selectedGenerationModel} onValueChange={setSelectedGenerationModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select generation model" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(models.available_models.recommended).map(([key, model]) => (
                    <SelectItem key={key} value={`openrouter/${key}`}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        {model.recommended && <Badge variant="secondary">Recommended</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Edit Model</label>
              <Select value={selectedEditModel} onValueChange={setSelectedEditModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select edit model" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(models.available_models.recommended).map(([key, model]) => (
                    <SelectItem key={key} value={`openrouter/${key}`}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        {model.recommended && <Badge variant="secondary">Recommended</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={updateModels} className="w-full">
            Update Image Models
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Models</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cost-effective alternatives to expensive models like GPT-4 Vision
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(models.available_models.recommended).map(([key, model]) => (
              <div key={key} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{model.name}</h4>
                  {model.recommended && <Badge variant="secondary">Recommended</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{model.description}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{model.provider}</Badge>
                  <Badge variant="outline">{model.cost_per_1k_tokens}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {model.features.map((feature) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

