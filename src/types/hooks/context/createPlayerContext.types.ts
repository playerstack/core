import type React from 'react';

/**
 * Options for creating a player context factory.
 */
export interface CreatePlayerContextOptions<S extends Record<string, any>> {
  actionTypes: string[];
  initialState: S;
  /** Optional translation resolver. Defaults to core's getTranslations. */
  getTranslationsFn?: (language: string) => Record<string, string>;
}

/**
 * The result of calling createPlayerContext — a Context, Provider, and bound hooks.
 */
export interface PlayerContextResult<S> {
  Context: React.Context<{ state: S; dispatch: React.Dispatch<any> }>;
  Provider: React.FC<ProviderProps>;
  useSelector: () => S;
  useDispatch: () => (action: any) => void;
}

/**
 * Props for the auto-generated Provider component.
 */
export interface ProviderProps {
  children: React.ReactNode;
  language?: string;
}
