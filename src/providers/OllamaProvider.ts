import axios from 'axios';
import { LLMProvider } from './LLMProvider.js';
import { Logger } from '../core/Logger.js';
import type { 
  PromptContext, 
  LLMResponse, 
  LLMModel, 
  LLMProviderOptions,
  StreamingCallback 
} from '../types/index.js';
import { CLIError } from '../core/errors.js';

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options: {
    temperature: number;
    top_p?: number;
    top_k?: number;
  };
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaProvider extends LLMProvider {
  private logger = Logger.getInstance();
  private host: string;
  private defaultModel: string;

  constructor(options: LLMProviderOptions) {
    super(options);
    this.host = options.host || 'http://localhost:11434';
    this.defaultModel = options.defaultModel || 'gpt-oss:latest';
  }

  getName(): string {
    return 'ollama';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.host}/api/version`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      this.logger.debug(`Ollama not available: ${error}`, 'OllamaProvider');
      return false;
    }
  }

  async listModels(): Promise<LLMModel[]> {
    try {
      this.logger.debug('Querying Ollama server for available models', 'OllamaProvider');
      
      const response = await axios.get(`${this.host}/api/tags`, {
        timeout: 10000
      });

      if (!response.data || !response.data.models) {
        return [];
      }

      return response.data.models.map((model: OllamaModel) => ({
        name: model.name,
        provider: 'ollama',
        size: model.size,
        isDefault: model.name === this.defaultModel,
        metadata: {
          digest: model.digest,
          modified_at: model.modified_at
        }
      }));
    } catch (error) {
      this.logger.debug(`Failed to list Ollama models: ${error}`, 'OllamaProvider');
      throw new CLIError(
        'Failed to connect to Ollama server',
        'ollama',
        error as Error
      );
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  async generateResponse(context: PromptContext): Promise<LLMResponse> {
    const model = context.options.model || this.defaultModel;
    const temperature = context.options.temperature || 0.7;

    this.logger.debug(`Generating response with model: ${model}`, 'OllamaProvider');

    try {
      const requestData: OllamaGenerateRequest = {
        model,
        prompt: context.prompt,
        stream: false,
        options: {
          temperature,
          top_p: context.options.topP,
          top_k: context.options.topK
        }
      };

      const response = await axios.post(`${this.host}/api/generate`, requestData, {
        timeout: 60000 // 60 second timeout for generation
      });

      const data: OllamaGenerateResponse = response.data;

      if (!data.response) {
        throw new CLIError('No response received from Ollama', 'ollama');
      }

      return {
        content: data.response,
        model,
        provider: 'ollama',
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        metadata: {
          total_duration: data.total_duration,
          load_duration: data.load_duration,
          prompt_eval_duration: data.prompt_eval_duration,
          eval_duration: data.eval_duration,
          context: data.context
        }
      };
    } catch (error) {
      this.handleOllamaError(error as any, model);
      throw error; // Re-throw after handling
    }
  }

  async generateStreamingResponse(
    context: PromptContext, 
    onChunk: StreamingCallback
  ): Promise<void> {
    const model = context.options.model || this.defaultModel;
    const temperature = context.options.temperature || 0.7;

    this.logger.debug(`Generating streaming response with model: ${model}`, 'OllamaProvider');

    try {
      const requestData: OllamaGenerateRequest = {
        model,
        prompt: context.prompt,
        stream: true,
        options: {
          temperature,
          top_p: context.options.topP,
          top_k: context.options.topK
        }
      };

      const response = await axios.post(`${this.host}/api/generate`, requestData, {
        responseType: 'stream',
        timeout: 60000
      });

      return new Promise((resolve, reject) => {
        let fullResponse = '';
        
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data: OllamaGenerateResponse = JSON.parse(line);
              
              if (data.response) {
                fullResponse += data.response;
                onChunk(data.response, false);
              }
              
              if (data.done) {
                onChunk('', true, {
                  totalContent: fullResponse,
                  usage: {
                    promptTokens: data.prompt_eval_count || 0,
                    completionTokens: data.eval_count || 0,
                    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
                  },
                  metadata: data
                });
                resolve();
              }
            } catch (parseError) {
              // Ignore JSON parsing errors for partial chunks
              this.logger.debug(`JSON parse error (expected for streaming): ${parseError}`, 'OllamaProvider');
            }
          }
        });

        response.data.on('error', (error: Error) => {
          this.logger.error('Streaming error', error, 'OllamaProvider');
          reject(error);
        });

        response.data.on('end', () => {
          resolve();
        });
      });
    } catch (error) {
      this.handleOllamaError(error as any, model);
      throw error;
    }
  }

  /**
   * Handle Ollama-specific errors with helpful messages
   */
  private handleOllamaError(error: any, model: string): void {
    if (error.code === 'ECONNREFUSED') {
      throw new CLIError(
        'Cannot connect to Ollama server. Make sure Ollama is running with: ollama serve',
        'ollama',
        error
      );
    } else if (error.response?.status === 404) {
      throw new CLIError(
        `Model '${model}' not found on Ollama server. Install it with: ollama pull ${model}`,
        'ollama',
        error
      );
    } else if (error.code === 'ENOTFOUND') {
      throw new CLIError(
        `Cannot resolve Ollama host: ${this.host}. Check your network connection.`,
        'ollama',
        error
      );
    } else if (error.code === 'ETIMEDOUT') {
      throw new CLIError(
        'Request to Ollama server timed out. The model might be too large or the server is overloaded.',
        'ollama',
        error
      );
    } else {
      throw new CLIError(
        `Ollama API error: ${error.message}`,
        'ollama',
        error
      );
    }
  }

  /**
   * Get Ollama server info
   */
  async getServerInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.host}/api/version`);
      return response.data;
    } catch (error) {
      throw new CLIError('Failed to get Ollama server info', 'ollama', error as Error);
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(model => model.name === modelName);
    } catch (error) {
      return false;
    }
  }
}