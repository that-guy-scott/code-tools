import type { 
  PromptContext, 
  LLMResponse, 
  LLMModel, 
  LLMProviderOptions,
  StreamingCallback 
} from '../types/index.js';

/**
 * Abstract base class for all LLM providers.
 * 
 * This class defines the common interface that all LLM providers must implement,
 * including methods for checking availability, listing models, and generating responses.
 * 
 * @example
 * ```typescript
 * class MyProvider extends LLMProvider {
 *   getName(): string { return 'my-provider'; }
 *   async isAvailable(): Promise<boolean> { return true; }
 *   // ... implement other abstract methods
 * }
 * ```
 */
export abstract class LLMProvider {
  protected options: LLMProviderOptions;

  constructor(options: LLMProviderOptions) {
    this.options = options;
  }

  /**
   * Get the unique identifier name for this provider.
   * 
   * @returns The provider name (e.g., 'ollama', 'openai', 'anthropic')
   */
  abstract getName(): string;

  /**
   * Check if the provider is available and can accept requests.
   * 
   * This typically involves checking network connectivity, authentication,
   * and service health.
   * 
   * @returns Promise that resolves to true if the provider is available
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Retrieve a list of all available models from this provider.
   * 
   * @returns Promise that resolves to an array of available models
   * @throws {CLIError} When the provider is unreachable or authentication fails
   */
  abstract listModels(): Promise<LLMModel[]>;

  /**
   * Generate a complete response for the given prompt context.
   * 
   * @param context - The prompt context containing user input and options
   * @returns Promise that resolves to the complete LLM response
   * @throws {CLIError} When generation fails or the model is not available
   */
  abstract generateResponse(context: PromptContext): Promise<LLMResponse>;

  /**
   * Generate a streaming response for the given prompt context.
   * 
   * @param context - The prompt context containing user input and options
   * @param onChunk - Callback function called for each response chunk
   * @throws {CLIError} When streaming fails or the model is not available
   */
  abstract generateStreamingResponse(
    context: PromptContext, 
    onChunk: StreamingCallback
  ): Promise<void>;

  /**
   * Get the default model name for this provider.
   * 
   * @returns The default model identifier
   */
  abstract getDefaultModel(): string;

  /**
   * Validate that a specific model is available from this provider.
   * 
   * @param modelName - The model name to validate
   * @returns Promise that resolves to true if the model exists
   */
  async validateModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some(model => model.name === modelName);
  }

  /**
   * Get a standardized connection error message for this provider.
   * 
   * @returns User-friendly error message for connection failures
   */
  protected getConnectionErrorMessage(): string {
    return `Cannot connect to ${this.getName()} provider`;
  }

  /**
   * Get a standardized model not found error message.
   * 
   * @param modelName - The name of the model that was not found
   * @returns User-friendly error message for missing models
   */
  public getModelNotFoundMessage(modelName: string): string {
    return `Model '${modelName}' not found for ${this.getName()} provider`;
  }
}