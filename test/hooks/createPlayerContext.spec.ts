/**
 * @jest-environment jsdom
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { createPlayerContext } from '../../src/hooks/context/createPlayerContext';

describe('createPlayerContext', () => {
  const actionTypes = ['i18n', 'menuVisible', 'videoRef', 'playerRef'];
  const initialState = {
    i18n: {} as Record<string, string>,
    menuVisible: false,
    videoRef: null as any,
    playerRef: null as any,
  };

  it('returns Context, Provider, useSelector, useDispatch', () => {
    const result = createPlayerContext({ actionTypes, initialState });
    expect(result).toHaveProperty('Context');
    expect(result).toHaveProperty('Provider');
    expect(result).toHaveProperty('useSelector');
    expect(result).toHaveProperty('useDispatch');
  });

  it('Provider initializes i18n from getTranslations(language)', () => {
    const { Provider, useSelector } = createPlayerContext({ actionTypes, initialState });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { language: 'en' }, children);

    const { result } = renderHook(() => useSelector(), { wrapper });

    // getTranslations('en') returns the English translations object
    expect(result.current.i18n).toBeDefined();
    expect(typeof result.current.i18n).toBe('object');
    expect(Object.keys(result.current.i18n).length).toBeGreaterThan(0);
  });

  it('Provider falls back to English when no language is provided', () => {
    const { Provider, useSelector } = createPlayerContext({ actionTypes, initialState });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, {}, children);

    const { result } = renderHook(() => useSelector(), { wrapper });

    expect(result.current.i18n).toBeDefined();
    expect(Object.keys(result.current.i18n).length).toBeGreaterThan(0);
  });

  it('useDispatch handles typed actions (type + payload)', () => {
    const { Provider, useSelector, useDispatch } = createPlayerContext({ actionTypes, initialState });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { language: 'en' }, children);

    const { result } = renderHook(
      () => ({
        state: useSelector(),
        dispatch: useDispatch(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.dispatch({ type: 'menuVisible', payload: true });
    });

    expect(result.current.state.menuVisible).toBe(true);
  });

  it('useDispatch handles object merge actions', () => {
    const { Provider, useSelector, useDispatch } = createPlayerContext({ actionTypes, initialState });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { language: 'en' }, children);

    const { result } = renderHook(
      () => ({
        state: useSelector(),
        dispatch: useDispatch(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.dispatch({ menuVisible: true });
    });

    expect(result.current.state.menuVisible).toBe(true);
  });

  it('useDispatch handles function actions (thunks)', () => {
    const { Provider, useSelector, useDispatch } = createPlayerContext({ actionTypes, initialState });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { language: 'en' }, children);

    const { result } = renderHook(
      () => ({
        state: useSelector(),
        dispatch: useDispatch(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.dispatch((state: typeof initialState) => ({
        type: 'menuVisible',
        payload: !state.menuVisible,
      }));
    });

    expect(result.current.state.menuVisible).toBe(true);
  });

  it('useDispatch maintains stable identity across renders', () => {
    const { Provider, useDispatch } = createPlayerContext({ actionTypes, initialState });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { language: 'en' }, children);

    const { result, rerender } = renderHook(() => useDispatch(), { wrapper });

    const firstDispatch = result.current;
    rerender();
    expect(result.current).toBe(firstDispatch);
  });

  it('Provider updates i18n when language prop changes', () => {
    const { Provider, useSelector } = createPlayerContext({ actionTypes, initialState });

    let lang = 'en';
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { language: lang }, children);

    const { result, rerender } = renderHook(() => useSelector(), { wrapper });

    const enI18n = result.current.i18n;

    lang = 'es';
    rerender();

    // After rerender with 'es', the i18n should change to Spanish
    expect(result.current.i18n).not.toBe(enI18n);
  });

  it('creating the context does not throw', () => {
    expect(() => createPlayerContext({ actionTypes, initialState })).not.toThrow();
  });
});
