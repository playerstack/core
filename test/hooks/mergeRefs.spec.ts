/**
 * @jest-environment jsdom
 */
import React from 'react';
import { mergeRefs } from '../../src/hooks/utils/mergeRefs';

describe('mergeRefs', () => {
  it('calls callback refs with the value', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();

    const merged = mergeRefs<HTMLDivElement>([cb1, cb2]);
    const div = document.createElement('div');

    merged(div);

    expect(cb1).toHaveBeenCalledWith(div);
    expect(cb2).toHaveBeenCalledWith(div);
  });

  it('assigns value to object refs (React.createRef)', () => {
    const ref1 = React.createRef<HTMLDivElement>();
    const ref2 = React.createRef<HTMLDivElement>();

    const merged = mergeRefs<HTMLDivElement>([ref1, ref2]);
    const div = document.createElement('div');

    merged(div);

    expect(ref1.current).toBe(div);
    expect(ref2.current).toBe(div);
  });

  it('handles mixed array of callback refs, object refs, null, and undefined', () => {
    const cb = jest.fn();
    const objRef = React.createRef<HTMLDivElement>();

    const merged = mergeRefs<HTMLDivElement>([cb, objRef, null, undefined]);
    const div = document.createElement('div');

    merged(div);

    expect(cb).toHaveBeenCalledWith(div);
    expect(objRef.current).toBe(div);
  });

  it('handles an empty array without errors', () => {
    const merged = mergeRefs<HTMLDivElement>([]);
    const div = document.createElement('div');

    expect(() => merged(div)).not.toThrow();
  });

  it('assigns value correctly on each call', () => {
    const objRef = React.createRef<HTMLDivElement>();
    const cb = jest.fn();

    const merged = mergeRefs<HTMLDivElement>([objRef, cb]);

    const div1 = document.createElement('div');
    const div2 = document.createElement('div');

    merged(div1);
    expect(objRef.current).toBe(div1);
    expect(cb).toHaveBeenCalledWith(div1);

    merged(div2);
    expect(objRef.current).toBe(div2);
    expect(cb).toHaveBeenCalledWith(div2);
  });
});
