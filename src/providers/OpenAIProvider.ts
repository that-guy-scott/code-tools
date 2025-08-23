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

export interface OpenAIOptions extends LLMProviderOptions {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  n?: number;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIChoice {
  index: number;
  message?: {
    role: 'assistant';
    content: string;
    refusal?: string;
  };
  delta?: {
    role?: 'assistant';
    content?: string;
    refusal?: string;
  };
  logprobs?: unknown;
  finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call' | null;
}

export interface OpenAICompletionResponse {
  id: string;
  object: 'chat.completion' | 'chat.completion.chunk';
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: OpenAIUsage;
  system_fingerprint?: string;
}

export interface OpenAIModelData {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

export interface OpenAIModelsResponse {
  object: 'list';
  data: OpenAIModelData[];
}

/**
 * OpenAI LLM provider implementation.
 * 
 * Supports both regular and streaming content generation using the OpenAI Chat Completions API.
 * Compatible with GPT-4, GPT-3.5-turbo, and other OpenAI chat models.
 * Requires a valid OpenAI API key for authentication.
 * 
 * @example
 * ```typescript
 * const provider = new OpenAIProvider({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   defaultModel: 'gpt-4o'
 * });
 * ```
 */
export class OpenAIProvider extends LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private organization?: string;
  private logger = Logger.getInstance();

  constructor(options: OpenAIOptions) {
    super(options);
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
    this.organization = options.organization;
    
    if (!this.apiKey) {
      throw new CLIError('OpenAI API key is required', 'config');
    }
  }

  /**
   * Get the provider name.
   * 
   * @returns The provider name 'openai'
   */
  getName(): string {
    return 'openai';
  }

  /**
   * Check if the OpenAI API is available.
   * 
   * @returns Promise that resolves to true if the API is reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/models`,
        {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 10000,
        }
      );
      return response.status === 200;
    } catch (error) {
      this.logger.debug(`OpenAI API not available: ${error}`, 'OpenAIProvider');
      return false;
    }
  }

  /**
   * List available OpenAI models.
   * 
   * @returns Promise that resolves to an array of available models
   */
  async listModels(): Promise<LLMModel[]> {
    try {
      const response: AxiosResponse<OpenAIModelsResponse> = await axios.get(
        `${this.baseUrl}/models`,
        {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 10000,
        }
      );

      if (!response.data.data) {
        throw new CLIError('No models returned from OpenAI API', 'api');
      }

      // Filter for chat models and sort by creation date (newest first)
      return response.data.data
        .filter(model => model.id.includes('gpt'))
        .sort((a, b) => b.created - a.created)
        .map((model: OpenAIModelData): LLMModel => ({
          name: model.id,
          displayName: model.id,
          description: `OpenAI ${model.id} model (${model.owned_by})`,
          size: undefined, // OpenAI doesn't provide model sizes
          isDefault: model.id === 'gpt-4o' || model.id === 'gpt-4o-mini',
          metadata: {
            created: model.created,
            owned_by: model.owned_by,
            object: model.object
          }
        }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new CLIError('Invalid OpenAI API key', 'auth');
        }
        if (error.response?.status === 403) {
          throw new CLIError('OpenAI API access denied. Check your API key permissions', 'auth');
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new CLIError('Cannot connect to OpenAI API', 'network');
        }
        if (error.code === 'ETIMEDOUT') {
          throw new CLIError('OpenAI API request timed out', 'timeout');
        }
      }
      throw new CLIError(`Failed to list OpenAI models: ${error}`, 'api');
    }
  }

  /**
   * Get the default OpenAI model.
   * 
   * @returns The default model name
   */
  getDefaultModel(): string {
    return this.options.defaultModel || 'gpt-4o';
  }

  /**
   * Generate a complete response using the OpenAI Chat Completions API.
   * 
   * @param context - The prompt context containing user input and options
   * @returns Promise that resolves to the complete LLM response
   */
  async generateResponse(context: PromptContext): Promise<LLMResponse> {
    const model = context.options.model || this.getDefaultModel();
    
    try {
      const requestData: OpenAICompletionRequest = {
        model,
        messages: [{ role: 'user', content: context.prompt }],
        temperature: context.options.temperature || 0.7,
        top_p: context.options.topP,
        max_tokens: context.options.maxTokens,
        stream: false,
        n: 1
      };

      const response: AxiosResponse<OpenAICompletionResponse> = await axios.post(
        `${this.baseUrl}/chat/completions`,
        requestData,
        {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 60000,
        }
      );

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new CLIError('No response generated by OpenAI', 'api');
      }

      const choice = response.data.choices[0];
      if (!choice) {
        throw new CLIError('No choice returned by OpenAI', 'api');
      }
      
      const content = choice.message?.content || '';

      if (!content && choice.message?.refusal) {
        throw new CLIError(
          `Request refused by OpenAI: ${choice.message.refusal}`,
          'safety'
        );
      }

      if (!content) {
        throw new CLIError('Empty response from OpenAI', 'api');
      }

      // Prepare usage metadata
      const usage = response.data.usage ? {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens
      } : undefined;

      return {
        content,
        model,
        provider: this.getName(),
        usage,
        metadata: {
          id: response.data.id,
          created: response.data.created,
          finishReason: choice.finish_reason,
          systemFingerprint: response.data.system_fingerprint
        }
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new CLIError('Invalid OpenAI API key', 'auth');
        }
        if (error.response?.status === 403) {
          throw new CLIError('OpenAI API access denied', 'auth');
        }
        if (error.response?.status === 404) {
          throw new CLIError(`Model '${model}' not found`, 'model');
        }
        if (error.response?.status === 429) {
          throw new CLIError('OpenAI API rate limit exceeded', 'rate_limit');
        }
        if (error.response?.data) {
          const apiError = error.response.data;
          if (apiError.error?.message) {
            throw new CLIError(`OpenAI API error: ${apiError.error.message}`, 'api');
          }
          throw new CLIError(`OpenAI API error: ${JSON.stringify(apiError)}`, 'api');
        }
      }
      
      if (error instanceof CLIError) {
        throw error;
      }
      
      throw new CLIError(`Failed to generate response: ${error}`, 'api');
    }
  }

  /**
   * Generate a streaming response using the OpenAI Chat Completions API.
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
      const requestData: OpenAICompletionRequest = {
        model,
        messages: [{ role: 'user', content: context.prompt }],
        temperature: context.options.temperature || 0.7,
        top_p: context.options.topP,
        max_tokens: context.options.maxTokens,
        stream: true,
        n: 1
      };

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        requestData,
        {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 60000,
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
          const trimmed = line.trim();
          
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            
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
              const data: OpenAICompletionResponse = JSON.parse(jsonStr);
              
              // Update token counts (if provided)
              if (data.usage) {
                totalTokens = {
                  prompt: data.usage.prompt_tokens,
                  completion: data.usage.completion_tokens,
                  total: data.usage.total_tokens
                };
              }
              
              // Extract text content from delta
              if (data.choices && data.choices.length > 0) {
                const choice = data.choices[0];
                if (!choice) return;
                
                const content = choice.delta?.content || '';
                
                // Handle refusal
                if (choice.delta?.refusal) {
                  throw new CLIError(
                    `Request refused by OpenAI: ${choice.delta.refusal}`,
                    'safety'
                  );
                }
                
                if (content) {
                  onChunk(content, false);
                }
                
                // Check for finish
                if (choice.finish_reason) {
                  onChunk('', true, { 
                    finishReason: choice.finish_reason,
                    usage: {
                      promptTokens: totalTokens.prompt,
                      completionTokens: totalTokens.completion,
                      totalTokens: totalTokens.total
                    }
                  });
                  return;
                }
              }
              
            } catch (parseError) {
              this.logger.debug(`Failed to parse SSE data: ${parseError}`, 'OpenAIProvider');
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
          throw new CLIError('Invalid OpenAI API key', 'auth');
        }
        if (error.response?.status === 404) {
          throw new CLIError(`Model '${model}' not found`, 'model');
        }
        if (error.response?.status === 429) {
          throw new CLIError('OpenAI API rate limit exceeded', 'rate_limit');
        }
      }
      
      if (error instanceof CLIError) {
        throw error;
      }
      
      throw new CLIError(`Failed to generate streaming response: ${error}`, 'stream');
    }
  }

  /**
   * Get HTTP headers for OpenAI API requests.
   * 
   * @returns Headers object with authorization and content type
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'code-tools-cli/2.0.0'
    };
    
    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }
    
    return headers;
  }

  /**
   * Get a standardized connection error message.
   * 
   * @returns User-friendly error message for connection failures
   */
  protected getConnectionErrorMessage(): string {
    return 'Cannot connect to OpenAI API. Check your internet connection and API key.';
  }

  /**
   * Get a standardized model not found error message.
   * 
   * @param modelName - The name of the model that was not found
   * @returns User-friendly error message for missing models
   */
  public getModelNotFoundMessage(modelName: string): string {
    return `Model '${modelName}' not found. Available OpenAI models: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo`;
  }
}