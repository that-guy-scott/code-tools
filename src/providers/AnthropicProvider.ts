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

export interface AnthropicOptions extends LLMProviderOptions {
  apiKey: string;
  baseUrl?: string;
  anthropicVersion?: string;
  anthropicBeta?: string[];
}

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicCompletionRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  system?: string;
}

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface AnthropicContentBlock {
  type: 'text';
  text: string;
}

export interface AnthropicCompletionResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  stop_sequence?: string;
  usage: AnthropicUsage;
}

export interface AnthropicStreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 
        'content_block_stop' | 'message_delta' | 'message_stop' | 'ping' | 'error';
  message?: Partial<AnthropicCompletionResponse>;
  content_block?: AnthropicContentBlock;
  delta?: {
    type: 'text_delta';
    text: string;
  } | {
    stop_reason: string;
    stop_sequence?: string;
  };
  usage?: AnthropicUsage;
  index?: number;
  error?: {
    type: string;
    message: string;
  };
}

export interface AnthropicModelData {
  id: string;
  type: 'model';
  display_name: string;
  created_at: string;
}

export interface AnthropicModelsResponse {
  data: AnthropicModelData[];
  has_more: boolean;
  first_id?: string;
  last_id?: string;
}

/**
 * Anthropic Claude LLM provider implementation.
 * 
 * Supports Claude 3 and Claude 4 models using the Messages API.
 * Includes streaming and non-streaming response handling with comprehensive error management.
 * Requires a valid Anthropic API key for authentication.
 * 
 * @example
 * ```typescript
 * const provider = new AnthropicProvider({
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   defaultModel: 'claude-3-7-sonnet-20250219'
 * });
 * ```
 */
export class AnthropicProvider extends LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private anthropicVersion: string;
  private anthropicBeta?: string[];
  private logger = Logger.getInstance();

  constructor(options: AnthropicOptions) {
    super(options);
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://api.anthropic.com';
    this.anthropicVersion = options.anthropicVersion || '2023-06-01';
    this.anthropicBeta = options.anthropicBeta;
    
    if (!this.apiKey) {
      throw new CLIError('Anthropic API key is required', 'config');
    }
  }

  /**
   * Get the provider name.
   * 
   * @returns The provider name 'anthropic'
   */
  getName(): string {
    return 'anthropic';
  }

  /**
   * Check if the Anthropic API is available.
   * 
   * @returns Promise that resolves to true if the API is reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/models`,
        {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 10000,
        }
      );
      return response.status === 200;
    } catch (error) {
      this.logger.debug(`Anthropic API not available: ${error}`, 'AnthropicProvider');
      return false;
    }
  }

  /**
   * List available Claude models.
   * 
   * @returns Promise that resolves to an array of available models
   */
  async listModels(): Promise<LLMModel[]> {
    try {
      const response: AxiosResponse<AnthropicModelsResponse> = await axios.get(
        `${this.baseUrl}/v1/models`,
        {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 10000,
        }
      );

      if (!response.data.data) {
        throw new CLIError('No models returned from Anthropic API', 'api');
      }

      // Sort models by creation date (newest first)
      return response.data.data
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((model: AnthropicModelData): LLMModel => ({
          name: model.id,
          displayName: model.display_name || model.id,
          description: `Anthropic ${model.display_name || model.id}`,
          size: undefined, // Anthropic doesn't provide model sizes
          isDefault: model.id === 'claude-3-7-sonnet-20250219',
          metadata: {
            created_at: model.created_at,
            type: model.type
          }
        }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new CLIError('Invalid Anthropic API key', 'auth');
        }
        if (error.response?.status === 403) {
          throw new CLIError('Anthropic API access denied. Check your API key permissions', 'auth');
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new CLIError('Cannot connect to Anthropic API', 'network');
        }
        if (error.code === 'ETIMEDOUT') {
          throw new CLIError('Anthropic API request timed out', 'timeout');
        }
      }
      throw new CLIError(`Failed to list Anthropic models: ${error}`, 'api');
    }
  }

  /**
   * Get the default Claude model.
   * 
   * @returns The default model name
   */
  getDefaultModel(): string {
    return this.options.defaultModel || 'claude-3-7-sonnet-20250219';
  }

  /**
   * Generate a complete response using the Anthropic Messages API.
   * 
   * @param context - The prompt context containing user input and options
   * @returns Promise that resolves to the complete LLM response
   */
  async generateResponse(context: PromptContext): Promise<LLMResponse> {
    const model = context.options.model || this.getDefaultModel();
    
    try {
      const requestData: AnthropicCompletionRequest = {
        model,
        messages: [{ role: 'user', content: context.prompt }],
        max_tokens: context.options.maxTokens || 4096,
        temperature: context.options.temperature,
        top_p: context.options.topP,
        top_k: context.options.topK,
        stream: false
      };

      const response: AxiosResponse<AnthropicCompletionResponse> = await axios.post(
        `${this.baseUrl}/v1/messages`,
        requestData,
        {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 60000,
        }
      );

      if (!response.data.content || response.data.content.length === 0) {
        throw new CLIError('No response generated by Anthropic Claude', 'api');
      }

      // Extract text content from content blocks
      const content = response.data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      if (!content) {
        throw new CLIError('Empty response from Anthropic Claude', 'api');
      }

      // Prepare usage metadata
      const usage = response.data.usage ? {
        promptTokens: response.data.usage.input_tokens,
        completionTokens: response.data.usage.output_tokens,
        totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens
      } : undefined;

      return {
        content,
        model,
        provider: this.getName(),
        usage,
        metadata: {
          id: response.data.id,
          stopReason: response.data.stop_reason,
          stopSequence: response.data.stop_sequence
        }
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new CLIError('Invalid Anthropic API key', 'auth');
        }
        if (error.response?.status === 403) {
          throw new CLIError('Anthropic API access denied', 'auth');
        }
        if (error.response?.status === 404) {
          throw new CLIError(`Model '${model}' not found`, 'model');
        }
        if (error.response?.status === 429) {
          throw new CLIError('Anthropic API rate limit exceeded', 'rate_limit');
        }
        if (error.response?.data) {
          const apiError = error.response.data;
          if (apiError.error?.message) {
            throw new CLIError(`Anthropic API error: ${apiError.error.message}`, 'api');
          }
          throw new CLIError(`Anthropic API error: ${JSON.stringify(apiError)}`, 'api');
        }
      }
      
      if (error instanceof CLIError) {
        throw error;
      }
      
      throw new CLIError(`Failed to generate response: ${error}`, 'api');
    }
  }

  /**
   * Generate a streaming response using the Anthropic Messages API.
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
      const requestData: AnthropicCompletionRequest = {
        model,
        messages: [{ role: 'user', content: context.prompt }],
        max_tokens: context.options.maxTokens || 4096,
        temperature: context.options.temperature,
        top_p: context.options.topP,
        top_k: context.options.topK,
        stream: true
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/messages`,
        requestData,
        {
          headers: this.getHeaders(),
          timeout: this.options.timeout || 60000,
          responseType: 'stream'
        }
      );

      let totalTokens = { input: 0, output: 0, total: 0 };
      let buffer = '';

      response.data.on('data', (chunk: Buffer) => {
        const chunkStr = chunk.toString('utf8');
        buffer += chunkStr;
        
        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          const trimmed = line.trim();
          
          if (trimmed.startsWith('event: ')) {
            continue; // Skip event type lines
          }
          
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            
            try {
              const data: AnthropicStreamEvent = JSON.parse(jsonStr);
              
              // Handle different event types
              if (data.type === 'message_start' && data.message?.usage) {
                totalTokens.input = data.message.usage.input_tokens;
                totalTokens.total = data.message.usage.input_tokens;
              }
              
              if (data.type === 'content_block_delta' && data.delta) {
                if ('type' in data.delta && data.delta.type === 'text_delta' && 'text' in data.delta) {
                  const content = data.delta.text || '';
                  if (content) {
                    onChunk(content, false);
                  }
                }
              }
              
              if (data.type === 'message_delta' && data.usage) {
                totalTokens.output = data.usage.output_tokens;
                totalTokens.total = totalTokens.input + data.usage.output_tokens;
              }
              
              if (data.type === 'message_stop') {
                onChunk('', true, { 
                  usage: {
                    promptTokens: totalTokens.input,
                    completionTokens: totalTokens.output,
                    totalTokens: totalTokens.total
                  }
                });
                return;
              }
              
              if (data.type === 'error') {
                throw new CLIError(
                  `Anthropic API error: ${data.error?.message || 'Unknown error'}`,
                  'api'
                );
              }
              
            } catch (parseError) {
              // Skip ping events and other non-JSON data
              if (!jsonStr.includes('"type": "ping"')) {
                this.logger.debug(`Failed to parse SSE data: ${parseError}`, 'AnthropicProvider');
              }
            }
          }
        }
      });

      response.data.on('end', () => {
        onChunk('', true, { 
          usage: {
            promptTokens: totalTokens.input,
            completionTokens: totalTokens.output,
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
          throw new CLIError('Invalid Anthropic API key', 'auth');
        }
        if (error.response?.status === 404) {
          throw new CLIError(`Model '${model}' not found`, 'model');
        }
        if (error.response?.status === 429) {
          throw new CLIError('Anthropic API rate limit exceeded', 'rate_limit');
        }
      }
      
      if (error instanceof CLIError) {
        throw error;
      }
      
      throw new CLIError(`Failed to generate streaming response: ${error}`, 'stream');
    }
  }

  /**
   * Get HTTP headers for Anthropic API requests.
   * 
   * @returns Headers object with authorization and content type
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'content-type': 'application/json',
      'anthropic-version': this.anthropicVersion,
      'user-agent': 'code-tools-cli/2.0.0'
    };
    
    if (this.anthropicBeta && this.anthropicBeta.length > 0) {
      headers['anthropic-beta'] = this.anthropicBeta.join(',');
    }
    
    return headers;
  }

  /**
   * Get a standardized connection error message.
   * 
   * @returns User-friendly error message for connection failures
   */
  protected getConnectionErrorMessage(): string {
    return 'Cannot connect to Anthropic API. Check your internet connection and API key.';
  }

  /**
   * Get a standardized model not found error message.
   * 
   * @param modelName - The name of the model that was not found
   * @returns User-friendly error message for missing models
   */
  public getModelNotFoundMessage(modelName: string): string {
    return `Model '${modelName}' not found. Available Claude models: claude-3-7-sonnet-20250219, claude-3-haiku-20240307, claude-3-opus-20240229`;
  }
}