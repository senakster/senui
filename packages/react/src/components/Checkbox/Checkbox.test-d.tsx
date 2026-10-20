import { createRef } from 'react';
import { describe, test } from 'vitest';
import type { DistributiveOmit } from '../../types.js';
import { CheckboxGroup } from '../CheckboxGroup/CheckboxGroup.js';
import { Switch } from '../Switch/Switch.js';
import { Checkbox, type CheckboxProps } from './Checkbox.js';

// Type tests for Checkbox, CheckboxGroup and Switch (L05 acceptance criteria).
describe('Checkbox types', () => {
  test('a name is required: label XOR aria-label / aria-labelledby (L05 decision 5)', () => {
    void (<Checkbox label="Subscribe" />);
    void (<Checkbox aria-label="Select all" />);
    void (<Checkbox aria-labelledby="col-heading" />);
    // @ts-expect-error -- no name
    void (<Checkbox />);
    // @ts-expect-error -- a visible label and an ARIA name compete
    void (<Checkbox label="Subscribe" aria-label="Subscribe to news" />);
    // @ts-expect-error -- a label that may be undefined
    void (<Checkbox label={undefined as string | undefined} />);
  });

  test('state is checked / onCheckedChange, and indeterminate is its own prop', () => {
    void (
      <Checkbox label="All" checked indeterminate onCheckedChange={(checked: boolean) => checked} />
    );
    void (
      (
        // @ts-expect-error -- indeterminate is the DOM property, never aria-checked
        <Checkbox label="All" aria-checked="mixed" />
      )
    );
    // @ts-expect-error -- checked is a boolean; indeterminate is separate (L05 decision 6)
    void (<Checkbox label="All" checked="indeterminate" />);
    // @ts-expect-error -- an error needs words
    void (<Checkbox label="Terms" error={true} />);
  });

  test('indeterminate is controlled only (L05 decision 6)', () => {
    const toggle = (checked: boolean) => checked;
    void (<Checkbox label="All" indeterminate={false} />);
    void (<Checkbox label="All" indeterminate checked={false} onCheckedChange={toggle} />);
    // @ts-expect-error -- without checked and onCheckedChange it could never leave the mixed state
    void (<Checkbox label="All" indeterminate />);
    // @ts-expect-error -- checked alone: nothing clears indeterminate
    void (<Checkbox label="All" indeterminate checked={false} />);
  });

  test('aria-invalid is never a prop: use error (ADR-0013)', () => {
    // @ts-expect-error -- Checkbox owns aria-invalid
    void (<Checkbox label="Terms" aria-invalid />);
    // @ts-expect-error -- a switch is never invalid
    void (<Switch label="Wi-Fi" aria-invalid />);
  });

  test('no colour or role props; native attributes and ref pass through', () => {
    void (
      <Checkbox
        label="Subscribe"
        name="news"
        value="weekly"
        className="row"
        ref={createRef<HTMLInputElement>()}
      />
    );
    // @ts-expect-error -- the element and role are fixed (ADR-0006)
    void (<Checkbox label="Subscribe" role="switch" />);
    // @ts-expect-error -- no ad-hoc re-skinning
    void (<Checkbox label="Subscribe" color="hotpink" />);
  });

  test('a wrapper keeps the name requirement with DistributiveOmit', () => {
    const Consent = (props: DistributiveOmit<CheckboxProps, 'required'>) => (
      <Checkbox {...props} required />
    );
    void (<Consent label="I accept the terms" />);
    // @ts-expect-error -- still requires a name
    void (<Consent />);
  });
});

describe('Switch types', () => {
  test('a name is required', () => {
    void (<Switch label="Wi-Fi" />);
    void (<Switch aria-label="Wi-Fi" />);
    void (<Switch aria-labelledby="wifi-heading" />);
    // @ts-expect-error -- no name
    void (<Switch />);
    // @ts-expect-error -- a visible label and an ARIA name compete
    void (<Switch label="Wi-Fi" aria-label="Wireless" />);
  });

  test('no indeterminate, required or error (L05 decision 8)', () => {
    // @ts-expect-error -- a switch has no mixed state
    void (<Switch label="Wi-Fi" indeterminate />);
    // @ts-expect-error -- a required switch is really a consent checkbox
    void (<Switch label="Wi-Fi" required />);
    // @ts-expect-error -- a switch takes effect at once: nothing to validate
    void (<Switch label="Wi-Fi" error="Turn it on." />);
  });
});

describe('CheckboxGroup types', () => {
  test('a legend is required; required takes the message', () => {
    const options = <Checkbox value="news" label="News" />;
    void (<CheckboxGroup legend="Topics">{options}</CheckboxGroup>);
    void (
      <CheckboxGroup legend="Topics" required="Choose at least one topic.">
        {options}
      </CheckboxGroup>
    );
    // @ts-expect-error -- no legend
    void (<CheckboxGroup>{options}</CheckboxGroup>);
    void (
      <CheckboxGroup
        legend="Topics"
        // @ts-expect-error -- required is the message, not a boolean
        required
      >
        {options}
      </CheckboxGroup>
    );
  });

  test('the legend is the only name; the group owns its invalid and required state', () => {
    const options = <Checkbox value="news" label="News" />;
    void (
      (
        // @ts-expect-error -- a second, competing group name
        <CheckboxGroup legend="Topics" aria-label="Subjects">
          {options}
        </CheckboxGroup>
      )
    );
    void (
      (
        // @ts-expect-error -- a second, competing group name
        <CheckboxGroup legend="Topics" aria-labelledby="heading">
          {options}
        </CheckboxGroup>
      )
    );
    void (
      (
        // @ts-expect-error -- use `error`
        <CheckboxGroup legend="Topics" aria-invalid>
          {options}
        </CheckboxGroup>
      )
    );
    void (
      (
        // @ts-expect-error -- use `required="<message>"`
        <CheckboxGroup legend="Topics" aria-required>
          {options}
        </CheckboxGroup>
      )
    );
  });
});
