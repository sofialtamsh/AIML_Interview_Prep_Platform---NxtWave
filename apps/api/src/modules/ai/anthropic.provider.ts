import Anthropic from '@anthropic-ai/sdk';
import { type AiCallRequest, type AiCallResult, AiError, type AiProvider } from './types.ts';

/**
 * Claude through the official SDK. Server-side only: the key comes from the environment and
 * never leaves this process.
 *
 * - Streaming, so long lessons never hit HTTP timeouts (`finalMessage()` collects the result).
 * - Structured outputs (`output_config.format`) make the reply follow our JSON Schema; Zod
 *   re-validates it in the gateway.
 * - Thinking is always on for the current models; `effort` sets how hard the model works.
 * - Stable instructions are cached (`cache_control`), so a lesson's many calls reuse them.
 * - Refusal fallback ("default"): if a safety classifier declines, the API retries on a
 *   suitable model within the same call instead of failing the job.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic' as const;
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 3 });
  }

  async call(req: AiCallRequest): Promise<AiCallResult> {
    let message: Anthropic.Beta.Messages.BetaMessage;
    try {
      message = await this.client.beta.messages
        .stream(
          {
            model: req.model,
            max_tokens: req.maxTokens,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system: req.system.map((s) => ({
              type: 'text' as const,
              text: s.text,
              ...(s.cache ? { cache_control: { type: 'ephemeral' as const } } : {}),
            })),
            messages: [{ role: 'user', content: req.user }],
            output_config: {
              effort: req.effort,
              format: { type: 'json_schema', schema: req.jsonSchema },
            },
          },
          { signal: req.signal },
        )
        .finalMessage();
    } catch (err) {
      throw toAiError(err, req.signal);
    }

    if (message.stop_reason === 'refusal') {
      throw new AiError(
        'refused',
        'The model declined this request. Try different instructions.',
        message.stop_details ?? null,
      );
    }
    if (message.stop_reason === 'max_tokens') {
      throw new AiError(
        'truncated',
        'The answer was cut off because it hit the length limit. Raise max tokens for this task, or ask for less.',
      );
    }
    const text = message.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();
    return {
      text,
      model: message.model,
      stopReason: message.stop_reason ?? 'unknown',
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
      },
    };
  }
}

/** SDK errors → messages an admin can act on. Most specific first; the SDK already retried transient ones. */
function toAiError(err: unknown, signal?: AbortSignal): AiError {
  if (signal?.aborted || err instanceof Anthropic.APIUserAbortError) {
    return new AiError('cancelled', 'The job was cancelled.');
  }
  if (
    err instanceof Anthropic.AuthenticationError ||
    err instanceof Anthropic.PermissionDeniedError
  ) {
    return new AiError(
      'not_configured',
      'The AI provider rejected the API key. Check ANTHROPIC_API_KEY in the server environment.',
    );
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new AiError(
      'provider',
      'The configured model was not found. Check the model in AI settings.',
    );
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AiError(
      'provider',
      'The AI provider is rate-limiting us. Try again in a few minutes.',
    );
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new AiError('provider', `The AI provider rejected the request: ${err.message}`);
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AiError(
      'provider',
      'Could not reach the AI provider. Check the server’s internet connection.',
    );
  }
  if (err instanceof Anthropic.APIError) {
    return new AiError(
      'provider',
      `The AI provider failed (${err.status ?? 'no status'}). Try again.`,
    );
  }
  return new AiError('provider', err instanceof Error ? err.message : 'The AI call failed.');
}
