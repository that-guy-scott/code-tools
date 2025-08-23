import axios, { AxiosResponse } from 'axios';
import type { 
  PromptContext, 
  LLMResponse, 
  LLMModel, 
  LLMProviderOptions,
  StreamingCallback 
} from '../types/index.js';
import { LLMProvider } from './LLMProvider.js';
import { CLIError } from '../core/errors.js';
import { Logger } from '../core/Logger.js';

export interface GeminiOptions extends LLMProviderOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface GeminiGenerateRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    candidateCount?: number;
  };
}

export interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
    index?: number;
    safetyRatings?: Array<unknown>;
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<unknown>;
  };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export interface GeminiModel {
  name: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
  temperature?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiListModelsResponse {
  models: GeminiModel[];
}

/**
 * Google Gemini LLM provider implementation.
 * 
 * Supports both regular and streaming content generation using the Gemini API.
 * Requires a valid Google API key for authentication.
 * 
 * @example
 * ```typescript
 * const provider = new GeminiProvider({
 *   apiKey: process.env.GOOGLE_API_KEY,
 *   defaultModel: 'gemini-2.0-flash'
 * });
 * ```
 */
export class GeminiProvider extends LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private logger = Logger.getInstance();

  constructor(options: GeminiOptions) {
    super(options);
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    
    if (!this.apiKey) {
      throw new CLIError('Google API key is required for Gemini provider', 'config');
    }
  }

  /**
   * Get the provider name.
   * 
   * @returns The provider name 'gemini'
   */
  getName(): string {
    return 'gemini';
  }

  /**
   * Check if the Gemini API is available.
   * 
   * @returns Promise that resolves to true if the API is reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/models`,
        {
          params: { key: this.apiKey },
          timeout: this.options.timeout || 10000,
        }
      );
      return response.status === 200;
    } catch (error) {
      this.logger.debug(`Gemini API not available: ${error}`, 'GeminiProvider');
      return false;
    }
  }

  /**
   * List available Gemini models.
   * 
   * @returns Promise that resolves to an array of available models
   */
  async listModels(): Promise<LLMModel[]> {
    try {
      const response: AxiosResponse<GeminiListModelsResponse> = await axios.get(
        `${this.baseUrl}/models`,
        {
          params: { key: this.apiKey },
          timeout: this.options.timeout || 10000,
        }
      );

      if (!response.data.models) {
        throw new CLIError('No models returned from Gemini API', 'api');
      }

      return response.data.models
        .filter(model => model.supportedGenerationMethods.includes('generateContent'))
        .map((model: GeminiModel): LLMModel => ({
          name: model.name.replace('models/', ''), // Remove prefix for display
          displayName: model.displayName,
          description: model.description,
          size: undefined, // Gemini doesn't provide model sizes
          isDefault: model.name.includes('gemini-2.0-flash'),
          metadata: {
            inputTokenLimit: model.inputTokenLimit,
            outputTokenLimit: model.outputTokenLimit,
            supportedMethods: model.supportedGenerationMethods,
            temperature: model.temperature,
            topP: model.topP,
            topK: model.topK
          }
        }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new CLIError('Invalid Google API key for Gemini', 'auth');
        }
        if (error.response?.status === 403) {
          throw new CLIError('Gemini API access denied. Check your API key permissions', 'auth');
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new CLIError('Cannot connect to Gemini API', 'network');
        }
        if (error.code === 'ETIMEDOUT') {
          throw new CLIError('Gemini API request timed out', 'timeout');
        }
      }
      throw new CLIError(`Failed to list Gemini models: ${error}`, 'api');
    }
  }

  /**
   * Get the default Gemini model.
   * 
   * @returns The default model name
   */
  getDefaultModel(): string {
    return this.options.defaultModel || 'gemini-2.0-flash';
  }

  /**
   * Generate a complete response using the Gemini API.
   * 
   * @param context - The prompt context containing user input and options
   * @returns Promise that resolves to the complete LLM response
   */
  async generateResponse(context: PromptContext): Promise<LLMResponse> {
    const model = context.options.model || this.getDefaultModel();
    
    try {
      const requestData: GeminiGenerateRequest = {
        contents: [{
          parts: [{ text: context.prompt }]
        }],
        generationConfig: {
          temperature: context.options.temperature || 0.7,
          topP: context.options.topP,
          topK: context.options.topK,
          maxOutputTokens: context.options.maxTokens,
          candidateCount: 1
        }
      };

      const response: AxiosResponse<GeminiGenerateResponse> = await axios.post(
        `${this.baseUrl}/models/${model}:generateContent`,
        requestData,
        {
          params: { key: this.apiKey },
          timeout: this.options.timeout || 60000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.data.candidates || response.data.candidates.length === 0) {
        // Check if blocked by safety filters
        if (response.data.promptFeedback?.blockReason) {
          throw new CLIError(
            `Content blocked by Gemini safety filters: ${response.data.promptFeedback.blockReason}`,
            'safety'
          );
        }
        throw new CLIError('No response generated by Gemini', 'api');
      }

      const candidate = response.data.candidates[0];
      if (!candidate) {
        throw new CLIError('No candidate response from Gemini', 'api');
      }
      
      const content = candidate.content?.parts?.[0]?.text || '';

      if (!content) {
        throw new CLIError('Empty response from Gemini', 'api');
      }

      // Prepare usage metadata
      const usage = response.data.usageMetadata ? {
        promptTokens: response.data.usageMetadata.promptTokenCount || 0,
        completionTokens: response.data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: response.data.usageMetadata.totalTokenCount || 0
      } : undefined;

      return {
        content,
        model,
        provider: this.getName(),
        usage,
        metadata: {
          finishReason: candidate.finishReason,
          safetyRatings: candidate.safetyRatings,
          candidateIndex: candidate.index
        }
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new CLIError('Invalid Google API key', 'auth');
        }
        if (error.response?.status === 403) {
          throw new CLIError('Gemini API access denied', 'auth');
        }
        if (error.response?.status === 404) {
          throw new CLIError(`Model '${model}' not found`, 'model');
        }
        if (error.response?.status === 429) {
          throw new CLIError('Gemini API rate limit exceeded', 'rate_limit');
        }
        if (error.response?.data) {
          const apiError = error.response.data;
          throw new CLIError(`Gemini API error: ${JSON.stringify(apiError)}`, 'api');
        }
      }
      
      if (error instanceof CLIError) {
        throw error;
      }
      
      throw new CLIError(`Failed to generate response: ${error}`, 'api');
    }
  }

  /**
   * Generate a streaming response using the Gemini API.
   * 
   * @param context - The prompt context containing user input and options
   * @param onChunk - Callback function called for each response chunk
   */
  async generateStreamingResponse(
    context: PromptContext, 
    onChunk: StreamingCallback
  ): Promise<void> {
    const model = context.options.model || this.getDefaultModel();
    
    try {
      const requestData: GeminiGenerateRequest = {
        contents: [{
          parts: [{ text: context.prompt }]
        }],
        generationConfig: {
          temperature: context.options.temperature || 0.7,
          topP: context.options.topP,
          topK: context.options.topK,
          maxOutputTokens: context.options.maxTokens,
          candidateCount: 1
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/models/${model}:streamGenerateContent`,
        requestData,
        {
          params: { 
            key: this.apiKey,
            alt: 'sse' // Enable Server-Sent Events
          },
          timeout: this.options.timeout || 60000,
          headers: {
            'Content-Type': 'application/json',
          },
          responseType: 'stream'
        }
      );

      let totalTokens = { prompt: 0, completion: 0, total: 0 };
      let buffer = '';

      response.data.on('data', (chunk: Buffer) => {
        const chunkStr = chunk.toString('utf8');
        buffer += chunkStr;
        
        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              onChunk('', true, { 
                usage: {
                  promptTokens: totalTokens.prompt,
                  completionTokens: totalTokens.completion,
                  totalTokens: totalTokens.total
                }
              });
              return;
            }
            
            try {
              const data: GeminiGenerateResponse = JSON.parse(jsonStr);
              
              // Update token counts
              if (data.usageMetadata) {
                totalTokens = {
                  prompt: data.usageMetadata.promptTokenCount || 0,
                  completion: data.usageMetadata.candidatesTokenCount || 0,
                  total: data.usageMetadata.totalTokenCount || 0
                };
              }
              
              // Extract text content
              if (data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                if (!candidate) return;
                
                const text = candidate.content?.parts?.[0]?.text || '';
                
                if (text) {
                  onChunk(text, false);
                }
                
                // Check for finish
                if (candidate.finishReason) {
                  onChunk('', true, { 
                    finishReason: candidate.finishReason,
                    usage: {
                      promptTokens: totalTokens.prompt,
                      completionTokens: totalTokens.completion,
                      totalTokens: totalTokens.total
                    }
                  });
                  return;
                }
              }
              
              // Check for safety blocks
              if (data.promptFeedback?.blockReason) {
                throw new CLIError(
                  `Content blocked by Gemini safety filters: ${data.promptFeedback.blockReason}`,
                  'safety'
                );
              }
              
            } catch (parseError) {
              this.logger.debug(`Failed to parse SSE data: ${parseError}`, 'GeminiProvider');
            }
          }
        }
      });

      response.data.on('end', () => {
        onChunk('', true, { 
          usage: {
            promptTokens: totalTokens.prompt,
            completionTokens: totalTokens.completion,
            totalTokens: totalTokens.total
          }
        });
      });

      response.data.on('error', (error: Error) => {
        throw new CLIError(`Streaming error: ${error.message}`, 'stream');
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new CLIError('Invalid Google API key', 'auth');
        }
        if (error.response?.status === 404) {
          throw new CLIError(`Model '${model}' not found`, 'model');
        }
        if (error.response?.status === 429) {
          throw new CLIError('Gemini API rate limit exceeded', 'rate_limit');
        }
      }
      
      if (error instanceof CLIError) {
        throw error;
      }
      
      throw new CLIError(`Failed to generate streaming response: ${error}`, 'stream');
    }
  }

  /**
   * Get a standardized connection error message.
   * 
   * @returns User-friendly error message for connection failures
   */
  protected getConnectionErrorMessage(): string {
    return 'Cannot connect to Gemini API. Check your internet connection and API key.';
  }

  /**
   * Get a standardized model not found error message.
   * 
   * @param modelName - The name of the model that was not found
   * @returns User-friendly error message for missing models
   */
  public getModelNotFoundMessage(modelName: string): string {
    return `Model '${modelName}' not found. Available Gemini models: gemini-2.0-flash, gemini-2.5-pro`;
  }
}