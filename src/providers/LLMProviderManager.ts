import { LLMProvider } from './LLMProvider.js';
import { OllamaProvider } from './OllamaProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { Logger } from '../core/Logger.js';
import { Config } from '../core/Config.js';
import type { 
  PromptContext, 
  LLMResponse, 
  LLMModel,
  LLMProviderOptions,
  StreamingCallback 
} from '../types/index.js';
import { CLIError } from '../core/errors.js';

export type ProviderType = 'ollama' | 'gemini' | 'openai' | 'anthropic';

/**
 * Manages multiple LLM providers and handles provider selection, model validation,
 * and request routing.
 * 
 * This class serves as the central coordinator for all LLM provider interactions,
 * providing a unified interface for prompt processing across different providers.
 * 
 * @example
 * ```typescript
 * const manager = new LLMProviderManager();
 * const response = await manager.processPrompt(context);
 * ```
 */
export class LLMProviderManager {
  private providers: Map<ProviderType, LLMProvider>;
  private logger = Logger.getInstance();
  private config = Config.getInstance();

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  /**
   * Initialize all available LLM providers with their configurations.
   * 
   * Initializes providers based on available API keys and configurations:
   * - Ollama (always available)  
   * - Gemini (if GOOGLE_API_KEY is set)
   * - OpenAI (if OPENAI_API_KEY is set)
   * - Anthropic (if ANTHROPIC_API_KEY is set)
   */
  private initializeProviders(): void {
    // Initialize Ollama provider
    const ollamaOptions: LLMProviderOptions = {
      host: this.config.app.ollama.host,
      defaultModel: this.config.app.ollama.defaultModel,
      timeout: 60000
    };
    this.providers.set('ollama', new OllamaProvider(ollamaOptions));

    // Initialize Gemini provider (if API key available)
    if (this.config.app.gemini.apiKey) {
      const geminiOptions: LLMProviderOptions & { apiKey: string } = {
        apiKey: this.config.app.gemini.apiKey,
        defaultModel: this.config.app.gemini.defaultModel,
        timeout: 60000
      };
      this.providers.set('gemini', new GeminiProvider(geminiOptions));
    }

    // Initialize OpenAI provider (if API key available)
    if (this.config.app.openai.apiKey) {
      const openaiOptions: LLMProviderOptions & { apiKey: string } = {
        apiKey: this.config.app.openai.apiKey,
        defaultModel: this.config.app.openai.defaultModel,
        timeout: 60000
      };
      this.providers.set('openai', new OpenAIProvider(openaiOptions));
    }

    // Initialize Anthropic provider (if API key available)
    if (this.config.app.anthropic.apiKey) {
      const anthropicOptions: LLMProviderOptions & { apiKey: string } = {
        apiKey: this.config.app.anthropic.apiKey,
        defaultModel: this.config.app.anthropic.defaultModel,
        timeout: 60000
      };
      this.providers.set('anthropic', new AnthropicProvider(anthropicOptions));
    }
  }

  /**
   * Retrieve a specific LLM provider by name.
   * 
   * @param providerName - The name of the provider to retrieve
   * @returns The requested LLM provider instance
   * @throws {CLIError} When the provider is not available
   */
  public getProvider(providerName: ProviderType): LLMProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new CLIError(`Provider '${providerName}' is not available`, 'provider');
    }
    return provider;
  }

  /**
   * Get the default LLM provider (currently Ollama).
   * 
   * @returns The default LLM provider instance
   */
  public getDefaultProvider(): LLMProvider {
    return this.getProvider('ollama');
  }

  /**
   * Resolve a provider name string to a valid ProviderType.
   * 
   * Handles the special case of 'auto' which defaults to 'ollama'.
   * 
   * @param provider - The provider name string to resolve
   * @returns The resolved ProviderType
   * @throws {CLIError} When the provider name is invalid
   */
  public resolveProviderName(provider: string): ProviderType {
    if (provider === 'auto') {
      return 'ollama';
    }
    
    if (!this.isValidProvider(provider)) {
      throw new CLIError(
        `Unknown provider '${provider}'. Available providers: ${this.getAvailableProviderNames().join(', ')}`,
        'provider'
      );
    }
    
    return provider as ProviderType;
  }

  /**
   * Type guard to check if a provider name is valid.
   * 
   * @param provider - The provider name to validate
   * @returns True if the provider is valid and available
   */
  private isValidProvider(provider: string): provider is ProviderType {
    return this.providers.has(provider as ProviderType);
  }

  /**
   * Get a list of all registered provider names.
   * 
   * @returns Array of available provider names
   */
  public getAvailableProviderNames(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get a list of providers that are currently available and working.
   * 
   * This method tests each provider's availability before including it in the result.
   * 
   * @returns Promise that resolves to an array of working provider names
   */
  public async getImplementedProviderNames(): Promise<ProviderType[]> {
    const implemented: ProviderType[] = [];
    
    for (const [name, provider] of this.providers.entries()) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          implemented.push(name);
        }
      } catch (error) {
        this.logger.debug(`Provider ${name} not available: ${error}`, 'LLMProviderManager');
      }
    }
    
    return implemented;
  }

  /**
   * Process a prompt using the specified provider and return a complete response.
   * 
   * Handles provider resolution, model validation, and request routing.
   * 
   * @param context - The prompt context containing user input and options
   * @returns Promise that resolves to the complete LLM response
   * @throws {CLIError} When provider or model is invalid, or generation fails
   */
  public async processPrompt(context: PromptContext): Promise<LLMResponse> {
    const providerName = this.resolveProviderName(context.options.provider);
    const provider = this.getProvider(providerName);

    this.logger.info(`Processing with ${providerName} provider...`, 'LLM');
    
    // Log model and parameters
    const model = context.options.model || provider.getDefaultModel();
    this.logger.item(`Model: ${model}`, 'primary');
    this.logger.item(`Temperature: ${context.options.temperature}`, 'secondary');
    
    if (context.options.topP) {
      this.logger.item(`Top-P: ${context.options.topP}`, 'secondary');
    }
    if (context.options.topK) {
      this.logger.item(`Top-K: ${context.options.topK}`, 'secondary');
    }
    
    this.logger.separator();

    // Validate model if specified
    if (context.options.model) {
      const isModelValid = await provider.validateModel(context.options.model);
      if (!isModelValid) {
        throw new CLIError(
          provider.getModelNotFoundMessage(context.options.model),
          'model'
        );
      }
    }

    return await provider.generateResponse(context);
  }

  /**
   * Process a prompt using the specified provider and stream the response.
   * 
   * @param context - The prompt context containing user input and options
   * @param onChunk - Callback function called for each response chunk
   * @throws {CLIError} When provider or model is invalid, or streaming fails
   */
  public async processStreamingPrompt(
    context: PromptContext,
    onChunk: StreamingCallback
  ): Promise<void> {
    const providerName = this.resolveProviderName(context.options.provider);
    const provider = this.getProvider(providerName);

    this.logger.info(`Streaming with ${providerName} provider...`, 'LLM');
    
    // Log model and parameters
    const model = context.options.model || provider.getDefaultModel();
    this.logger.item(`Model: ${model}`, 'primary');
    this.logger.item(`Temperature: ${context.options.temperature}`, 'secondary');
    this.logger.separator();

    // Validate model if specified
    if (context.options.model) {
      const isModelValid = await provider.validateModel(context.options.model);
      if (!isModelValid) {
        throw new CLIError(
          provider.getModelNotFoundMessage(context.options.model),
          'model'
        );
      }
    }

    return await provider.generateStreamingResponse(context, onChunk);
  }

  /**
   * Retrieve available models from all providers.
   * 
   * @returns Promise that resolves to a map of provider names to their available models
   */
  public async listAllModels(): Promise<Map<ProviderType, LLMModel[]>> {
    const modelsByProvider = new Map<ProviderType, LLMModel[]>();

    for (const [providerName, provider] of this.providers.entries()) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          const models = await provider.listModels();
          modelsByProvider.set(providerName, models);
        } else {
          this.logger.debug(`Provider ${providerName} not available for model listing`, 'LLMProviderManager');
        }
      } catch (error) {
        this.logger.debug(`Failed to list models for ${providerName}: ${error}`, 'LLMProviderManager');
        modelsByProvider.set(providerName, []);
      }
    }

    return modelsByProvider;
  }

  /**
   * Retrieve available models for a specific provider.
   * 
   * @param providerName - The name of the provider to query
   * @returns Promise that resolves to an array of available models
   * @throws {CLIError} When the provider is not available
   */
  public async listModelsForProvider(providerName: ProviderType): Promise<LLMModel[]> {
    const provider = this.getProvider(providerName);
    
    try {
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        throw new CLIError(`Provider ${providerName} is not available`, 'provider');
      }
      
      return await provider.listModels();
    } catch (error) {
      this.logger.error(`Failed to list models for ${providerName}`, error as Error, 'LLMProviderManager');
      throw error;
    }
  }

  /**
   * Check the availability of all providers and display their status.
   * 
   * Outputs formatted status information including model counts and default models
   * where available.
   */
  public async displayProviderStatus(): Promise<void> {
    this.logger.section('📡 LLM Provider Status:');
    
    for (const [providerName, provider] of this.providers.entries()) {
      try {
        const isAvailable = await provider.isAvailable();
        const status = isAvailable ? '✅ Available' : '❌ Unavailable';
        const level = isAvailable ? 'primary' : 'secondary';
        
        this.logger.item(`  ${providerName}: ${status}`, level);
        
        if (isAvailable && providerName === 'ollama') {
          // Show Ollama-specific info
          const ollamaProvider = provider as OllamaProvider;
          try {
            const models = await ollamaProvider.listModels();
            const modelCount = models.length;
            const defaultModel = models.find(m => m.isDefault)?.name || 'none';
            
            this.logger.item(`    Models: ${modelCount}, Default: ${defaultModel}`, 'secondary');
          } catch (error) {
            this.logger.item(`    Models: Unable to fetch`, 'secondary');
          }
        }
      } catch (error) {
        this.logger.item(`  ${providerName}: ❌ Error`, 'secondary');
        this.logger.item(`    ${(error as Error).message}`, 'secondary');
      }
    }
  }
}