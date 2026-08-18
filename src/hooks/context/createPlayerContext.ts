import React from 'react';
import { createTypedReducer } from '@reducer';
import { getTranslations as defaultGetTranslations } from '@i18n/index';
import type {
  CreatePlayerContextOptions,
  PlayerContextResult,
  ProviderProps,
} from '@typings/hooks/context/createPlayerContext.types';

export type {
  CreatePlayerContextOptions,
  PlayerContextResult,
  ProviderProps,
} from '@typings/hooks/context/createPlayerContext.types';

/**
 * Factory that creates a typed player context with reducer, Provider, and hooks.
 *
 * The Provider:
 * - Uses `useReducer` internally with `createTypedReducer(actionTypes)`
 * - Initializes `i18n` field in state from `getTranslations(language)`
 * - Accepts a `language` prop that updates i18n on change
 *
 * The dispatch supports:
 * - Function actions (thunks): `dispatch((state) => ({ type, payload }))`
 * - Typed actions: `dispatch({ type, payload })`
 * - Object merge: `dispatch({ key1: value1, key2: value2 })`
 *
 * @param options - actionTypes whitelist and initial state shape
 * @returns { Context, Provider, useSelector, useDispatch }
 */
export function createPlayerContext<S extends Record<string, any>>(
  options: CreatePlayerContextOptions<S>,
): PlayerContextResult<S> {
  const { actionTypes, initialState, getTranslationsFn } = options;
  const getTranslations = getTranslationsFn || defaultGetTranslations;
  const reducer = createTypedReducer<S>(actionTypes);

  const Context = React.createContext<{ state: S; dispatch: React.Dispatch<any> }>({
    state: initialState,
    dispatch: () => null,
  });

  const Provider: React.FC<ProviderProps> = ({ children, language }) => {
    const [state, dispatch] = React.useReducer(reducer, {
      ...initialState,
      i18n: getTranslations(language || 'en'),
    } as S);

    // Update i18n when language prop changes
    const prevLanguageRef = React.useRef(language);
    React.useEffect(() => {
      if (prevLanguageRef.current !== language) {
        prevLanguageRef.current = language;
        dispatch({ type: 'i18n', payload: getTranslations(language || 'en') });
      }
    }, [language, dispatch]);

    const context = React.useMemo(() => ({ state, dispatch }), [state, dispatch]);

    return React.createElement(Context.Provider, { value: context }, children);
  };

  Provider.displayName = 'PlayerContextProvider';

  const useSelector = (): S => {
    const { state } = React.useContext(Context);
    return state;
  };

  const useDispatch = (): ((action: any) => void) => {
    const { state, dispatch } = React.useContext(Context);

    // Keep a stable ref to state so enhancedDispatch identity doesn't change
    // on every state update (prevents infinite render loops in consumers).
    const stateRef = React.useRef(state);
    stateRef.current = state;

    const enhancedDispatch = React.useCallback(
      (action: any) => {
        if (typeof action === 'function') {
          const resolvedAction = action(stateRef.current);
          dispatch(resolvedAction);
        } else {
          dispatch(action);
        }
      },
      [dispatch],
    );

    return enhancedDispatch;
  };

  return { Context, Provider, useSelector, useDispatch };
}
