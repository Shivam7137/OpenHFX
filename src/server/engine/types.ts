import type { Preparation, ReportSuggestion, Category, Location } from '../../contracts';

export type EngineMode = Preparation['mode'];
export type EngineErrorCode = 'INVALID_INPUT' | 'UNCONFIGURED' | 'INVALID_OUTPUT' | 'PROVIDER_FAILURE' | 'PROVIDER_REFUSAL' | 'TIMEOUT' | 'CANCELLED' | 'STALE';

const messages: Record<EngineErrorCode, string> = {
  INVALID_INPUT: 'The report context is invalid. Review the report and try again.',
  UNCONFIGURED: 'Report suggestions are not configured. You can continue manually.',
  INVALID_OUTPUT: 'The suggestion could not be validated. You can continue manually.',
  PROVIDER_FAILURE: 'Suggestions are temporarily unavailable. You can continue manually.',
  PROVIDER_REFUSAL: 'A suggestion could not be prepared for this report. You can continue manually.',
  TIMEOUT: 'Suggestions took too long. You can continue manually.',
  CANCELLED: 'Suggestion preparation was cancelled.',
  STALE: 'This report draft has changed. Prepare a new suggestion.',
};

export class EngineError extends Error {
  constructor(public readonly code: EngineErrorCode, public readonly attempts = 0) {
    super(messages[code]);
    this.name = 'EngineError';
  }
}

/** Adapters must normalize errors here; arbitrary errors are never retried or exposed. */
export class ProviderError extends Error {
  constructor(public readonly kind: 'transient' | 'refusal' | 'permanent') {
    super('Provider request failed.');
    this.name = 'ProviderError';
  }
}

export interface ProviderRequest {
  promptVersion: string;
  instructions: string;
  /** JSON-encoded, explicitly untrusted source data. Never interpolate into instructions. */
  data: string;
  maxOutputTokens: number;
  outputSchema: Record<string, unknown>;
}

export interface ReportProvider {
  id: string;
  model: string;
  generate(request: ProviderRequest, options: { signal: AbortSignal }): Promise<unknown>;
}

export interface EngineOptions {
  mode?: EngineMode;
  provider?: ReportProvider;
  signal?: AbortSignal;
  /** The caller can compare its persisted draft revision without exposing persistence here. */
  isCurrent?: () => boolean;
}

export interface EngineResult {
  suggestion: ReportSuggestion;
  mode: EngineMode;
  provider: string | null;
  model: string | null;
  promptVersion: string;
  attempts: number;
  latencyMs: number;
}

export interface SafeOrganization {
  id: string;
  name: string;
  categoryIds: Category[];
}

export interface SafeCandidate {
  id: string;
  title: string;
  summary: string;
  category: Category;
  publicLocation: Location;
}
