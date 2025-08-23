import type { PromptContext } from '../types/index.js';
import { Logger } from '../core/Logger.js';
import { LLMProviderManager } from '../providers/LLMProviderManager.js';
import type { MCPManager } from '../mcp/MCPManager.js';

/**
 * Command handler for processing user prompts through LLM providers.
 * 
 * This class coordinates between the CLI interface, LLM providers, and output formatting
 * to deliver responses in various formats (text, JSON, streaming).
 * 
 * @example
 * ```typescript
 * const promptCommand = new PromptCommand(mcpManager);
 * await promptCommand.processPrompt(context);
 * ```
 */
export class PromptCommand {
  private logger = Logger.getInstance();
  private mcpManager: MCPManager;
  private providerManager: LLMProviderManager;

  constructor(mcpManager: MCPManager) {
    this.mcpManager = mcpManager;
    this.providerManager = new LLMProviderManager();
  }

  /**
   * Main entry point for processing user prompts.
   * 
   * Determines whether to use streaming or regular response based on context options,
   * handles error logging and re-throws errors for upstream handling.
   * 
   * @param context - The prompt context containing user input and options
   * @throws {CLIError} When prompt processing fails
   */
  public async processPrompt(context: PromptContext): Promise<void> {
    this.logger.info(`Processing prompt with provider: ${context.options.provider}`, 'Prompt');
    this.logger.debug(`Prompt length: ${context.prompt.length} characters`, 'Prompt');
    
    if (context.stdinData) {
      this.logger.debug(`Stdin data length: ${context.stdinData.length} characters`, 'Prompt');
    }

    try {
      if (context.options.stream) {
        // Handle streaming response
        await this.processStreamingPrompt(context);
      } else {
        // Handle regular response
        await this.processRegularPrompt(context);
      }
    } catch (error) {
      this.logger.error('Failed to process prompt', error as Error, 'Prompt');
      throw error;
    }
  }

  /**
   * Process a prompt with real-time streaming response output.
   * 
   * Streams response chunks directly to stdout as they arrive, providing
   * immediate feedback to the user.
   * 
   * @param context - The prompt context containing user input and options
   */
  private async processStreamingPrompt(context: PromptContext): Promise<void> {
    this.logger.section('🤖 Response:');

    await this.providerManager.processStreamingPrompt(context, (chunk, done, metadata) => {
      if (!done) {
        process.stdout.write(chunk);
      } else {
        // Stream is complete
        process.stdout.write('\n\n');
        
        if (metadata?.usage) {
          this.logger.separator();
          this.logger.item(`Tokens: ${metadata.usage.totalTokens} (${metadata.usage.promptTokens} prompt, ${metadata.usage.completionTokens} completion)`, 'secondary');
        }
      }
    });
  }

  /**
   * Process a prompt with a complete response returned at once.
   * 
   * Handles both text and JSON output formats, and displays token usage information.
   * 
   * @param context - The prompt context containing user input and options
   */
  private async processRegularPrompt(context: PromptContext): Promise<void> {
    const response = await this.providerManager.processPrompt(context);

    // Display the response
    this.logger.section('🤖 Response:');
    
    if (context.options.output === 'json') {
      // JSON output format
      const jsonOutput = {
        content: response.content,
        model: response.model,
        provider: response.provider,
        usage: response.usage,
        metadata: response.metadata
      };
      console.log(JSON.stringify(jsonOutput, null, 2));
    } else {
      // Text output format
      console.log(response.content);
    }

    // Show usage information
    if (response.usage) {
      this.logger.separator();
      this.logger.item(`Tokens: ${response.usage.totalTokens} (${response.usage.promptTokens} prompt, ${response.usage.completionTokens} completion)`, 'secondary');
    }
  }

  /**
   * Display the status and availability of all registered LLM providers.
   */
  public async listProviders(): Promise<void> {
    await this.providerManager.displayProviderStatus();
  }

  /**
   * Display all available models from all registered providers.
   * 
   * Shows models organized by provider with model details including size,
   * modification time, and other metadata where available.
   */
  public async listAllModels(): Promise<void> {
    this.logger.section('📚 Available Models:');
    
    try {
      const modelsByProvider = await this.providerManager.listAllModels();
      
      if (modelsByProvider.size === 0) {
        this.logger.warn('No providers available or no models found');
        return;
      }

      for (const [providerName, models] of modelsByProvider.entries()) {
        this.logger.separator();
        this.logger.item(`${providerName.toUpperCase()}:`, 'primary');
        
        if (models.length === 0) {
          this.logger.item('  No models available', 'secondary');
          continue;
        }

        for (const model of models) {
          const defaultMarker = model.isDefault ? ' (default)' : '';
          const sizeInfo = model.size ? ` [${this.formatBytes(model.size)}]` : '';
          this.logger.item(`  • ${model.name}${defaultMarker}${sizeInfo}`, model.isDefault ? 'primary' : 'secondary');
        }
      }
    } catch (error) {
      this.logger.error('Failed to list models', error as Error, 'Prompt');
    }
  }

  /**
   * Display available models for a specific provider.
   * 
   * Shows detailed model information including names, sizes, modification dates,
   * and default model indicators.
   * 
   * @param providerName - The name of the provider to list models for
   */
  public async listModelsForProvider(providerName: string): Promise<void> {
    try {
      const resolvedProvider = this.providerManager.resolveProviderName(providerName);
      this.logger.section(`📚 ${resolvedProvider.toUpperCase()} Models:`);
      
      const models = await this.providerManager.listModelsForProvider(resolvedProvider);
      
      if (models.length === 0) {
        this.logger.warn(`No models available for ${resolvedProvider}`);
        return;
      }

      for (const model of models) {
        const defaultMarker = model.isDefault ? ' (default)' : '';
        const sizeInfo = model.size ? ` [${this.formatBytes(model.size)}]` : '';
        
        this.logger.item(`• ${model.name}${defaultMarker}${sizeInfo}`, model.isDefault ? 'primary' : 'secondary');
        
        if (model.metadata?.modified_at) {
          const modifiedDate = new Date(model.metadata.modified_at).toLocaleDateString();
          this.logger.item(`  Modified: ${modifiedDate}`, 'secondary');
        }
      }
      
    } catch (error) {
      this.logger.error(`Failed to list ${providerName} models`, error as Error, 'Prompt');
    }
  }

  /**
   * Convert byte values to human-readable format (B, KB, MB, GB, TB).
   * 
   * @param bytes - The number of bytes to format
   * @returns Formatted string with appropriate unit suffix
   */
  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}