// The reference type test (L02). Each component's `<Name>.test-d.tsx` follows this shape; the
// example props below exist only here. Type tests are type-checked by Vitest, never executed.
import {
  createRef,
  type ForwardRefExoticComponent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
} from 'react';
import { describe, expectTypeOf, test } from 'vitest';
import type { DistributiveOmit } from '../types.js';
import type { NativeProps } from './native-props.js';

// Rule 1: variants are closed unions. No `string` fallback, no free colour.
type Variant = 'primary' | 'secondary' | 'danger';

// Rule 3: an accessible name is required at the type level. An icon-only control takes its icon as
// the `icon` prop, has no children, and must carry exactly one of `aria-label` or
// `aria-labelledby`: a discriminated union, not docs. Without `icon`, children (the visible label)
// are required. "Children are text" can't be typed; useNameCheck warns at runtime instead.
type Labelled =
  | { icon?: never; children: ReactNode }
  | {
      icon: ReactElement;
      children?: never;
      'aria-label': string;
      'aria-labelledby'?: never;
    }
  | {
      icon: ReactElement;
      children?: never;
      'aria-labelledby': string;
      'aria-label'?: never;
    };

// Rule 2: native attributes and className pass through via NativeProps, which removes `color`,
// `children` and `role`. No sx/css props exist to pass.
type ExampleProps = NativeProps<'button'> & { variant?: Variant } & Labelled;

// Rule 4: the component is a forwardRef, which keeps the union intact.
declare const Example: ForwardRefExoticComponent<ExampleProps & RefAttributes<HTMLButtonElement>>;

const icon = <svg aria-hidden="true" />;

describe('conventions (reference)', () => {
  test('variants are a closed union', () => {
    expectTypeOf<NonNullable<ExampleProps['variant']>>().toEqualTypeOf<Variant>();
    // @ts-expect-error -- a variant outside the union is a compile error, not a runtime fallback
    void (<Example variant="ghostly">Save</Example>);
  });

  test('an icon-only control takes `icon`, no children, and exactly one name', () => {
    void (<Example icon={icon} aria-label="Close" />);
    void (<Example icon={icon} aria-labelledby="dialog-title" />);
    // @ts-expect-error -- icon-only with no name
    void (<Example icon={icon} />);
    // @ts-expect-error -- both name sources at once is ambiguous
    void (<Example icon={icon} aria-label="Close" aria-labelledby="dialog-title" />);
    void (
      (
        // @ts-expect-error -- an icon-only control has no visible label
        <Example icon={icon} aria-label="Close">
          Close
        </Example>
      )
    );
  });

  test('without an icon, the visible label is required', () => {
    void (<Example>Save</Example>);
    // @ts-expect-error -- no icon and no children: nothing to name it
    void (<Example />);
  });

  test('native attributes, className and ref pass through; there is no colour or role prop', () => {
    void (
      <Example type="submit" className="checkout" onClick={() => undefined}>
        Pay
      </Example>
    );
    void (<Example ref={createRef<HTMLButtonElement>()}>Pay</Example>);
    // @ts-expect-error -- no ad-hoc re-skinning
    void (<Example color="hotpink">Pay</Example>);
    // @ts-expect-error -- the element's role is fixed by its contract (ADR-0006)
    void (<Example role="presentation">Pay</Example>);
  });

  test('a wrapper keeps the name requirement only with DistributiveOmit', () => {
    type DangerProps = DistributiveOmit<ExampleProps, 'variant'>;
    const Danger = (props: DangerProps) => <Example {...props} variant="danger" />;
    void (<Danger icon={icon} aria-label="Delete" />);
    // @ts-expect-error -- still requires a name
    void (<Danger icon={icon} />);

    // A plain Omit collapses the union to its shared keys, so the same mistake compiles. This is
    // the reason DistributiveOmit exists; don't copy this line.
    type Collapsed = Omit<ExampleProps, 'variant'>;
    expectTypeOf<{ icon: ReactElement; children?: undefined }>().toExtend<Collapsed>();
  });
});
