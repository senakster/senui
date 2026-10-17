import { createRef } from 'react';
import { describe, expectTypeOf, test } from 'vitest';
import type { DistributiveOmit } from '../../types.js';
import { Button, type ButtonProps, type ButtonVariant } from './Button.js';

const icon = <svg aria-hidden="true" />;

describe('Button types', () => {
  test('variant and size are closed unions', () => {
    expectTypeOf<ButtonVariant>().toEqualTypeOf<'primary' | 'secondary' | 'ghost' | 'danger'>();
    // @ts-expect-error -- not a variant
    void (<Button variant="purple">Save</Button>);
    // @ts-expect-error -- not a size
    void (<Button size="xl">Save</Button>);
  });

  test('icon-only requires exactly one name, and no children', () => {
    void (<Button icon={icon} aria-label="Close" />);
    void (<Button icon={icon} aria-labelledby="dialog-title" />);
    // @ts-expect-error -- icon without a name
    void (<Button icon={icon} />);
    // @ts-expect-error -- two name sources
    void (<Button icon={icon} aria-label="Close" aria-labelledby="dialog-title" />);
    void (
      (
        // @ts-expect-error -- icon-only takes no children
        <Button icon={icon} aria-label="Close">
          Close
        </Button>
      )
    );
  });

  test('without an icon, the label is required', () => {
    void (<Button>Save</Button>);
    // @ts-expect-error -- nothing to name it
    void (<Button />);
  });

  test('no colour or role props; native attributes and ref pass through', () => {
    void (
      <Button type="submit" form="checkout" className="pay" ref={createRef<HTMLButtonElement>()}>
        Pay
      </Button>
    );
    // @ts-expect-error -- no ad-hoc re-skinning
    void (<Button color="hotpink">Pay</Button>);
    // @ts-expect-error -- the element and role are fixed (ADR-0006)
    void (<Button role="link">Pay</Button>);
  });

  test('a wrapper keeps the name requirement with DistributiveOmit', () => {
    const Danger = (props: DistributiveOmit<ButtonProps, 'variant'>) => (
      <Button {...props} variant="danger" />
    );
    void (<Danger icon={icon} aria-label="Delete" />);
    // @ts-expect-error -- still requires a name
    void (<Danger icon={icon} />);
  });
});
