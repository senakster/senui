import { createRef } from 'react';
import { describe, expectTypeOf, test } from 'vitest';
import type { DistributiveOmit } from '../../types.js';
import { FormField, type FormFieldBinding } from '../FormField/FormField.js';
import { TextInput, type TextInputProps, type TextInputSize } from './TextInput.js';

describe('TextInput types', () => {
  test('standalone, a name is required: exactly one of aria-label / aria-labelledby', () => {
    void (<TextInput aria-label="Search" />);
    void (<TextInput aria-labelledby="search-heading" />);
    // @ts-expect-error -- no name
    void (<TextInput />);
    // @ts-expect-error -- two name sources
    void (<TextInput aria-label="Search" aria-labelledby="search-heading" />);
    // @ts-expect-error -- a placeholder is not a name
    void (<TextInput placeholder="Search" />);
  });

  test('inside a FormField, the binding names it', () => {
    void (<FormField label="Email">{(field) => <TextInput field={field} />}</FormField>);
  });

  test('the binding is sealed: only FormField can make one', () => {
    // @ts-expect-error -- a hand-made object is not a binding
    void (<TextInput field={{ id: 'email' }} />);
    expectTypeOf<{ id: string }>().not.toExtend<FormFieldBinding>();
  });

  test('with a binding, the field owns the label, id, required and invalid state (L04 decision 6)', () => {
    void (
      <FormField label="Email">
        {(field) => (
          <>
            {/* @ts-expect-error -- a second, competing label */}
            <TextInput field={field} aria-label="Email address" />
            {/* @ts-expect-error -- the field owns the id its label points at */}
            <TextInput field={field} id="email" />
            {/* @ts-expect-error -- pass `required` to the FormField */}
            <TextInput field={field} required />
            {/* @ts-expect-error -- pass `error` to the FormField */}
            <TextInput field={field} aria-invalid />
          </>
        )}
      </FormField>
    );
  });

  test('FormField requires a label and a render function', () => {
    // @ts-expect-error -- no label
    void (<FormField>{(field) => <TextInput field={field} />}</FormField>);
    const maybeLabel = undefined as string | undefined;
    const control = (field: FormFieldBinding) => <TextInput field={field} />;
    // @ts-expect-error -- a label that may be undefined
    void (<FormField label={maybeLabel}>{control}</FormField>);
    void (
      <FormField label="Email">
        {/* @ts-expect-error -- children must be a function of the binding */}
        <TextInput aria-label="Email" />
      </FormField>
    );
  });

  test('FormField error is a message, never a boolean; undefined is allowed', () => {
    const maybeError = undefined as string | undefined;
    const control = (field: FormFieldBinding) => <TextInput field={field} />;
    void (
      <FormField label="Email" error={maybeError}>
        {control}
      </FormField>
    );
    void (
      <FormField label="Email" error={false}>
        {control}
      </FormField>
    );
    void (
      <FormField
        label="Email"
        // @ts-expect-error -- an error needs words: `true` would show an icon and nothing else
        error={true}
      >
        {control}
      </FormField>
    );
  });

  test("FormField's root takes no control ARIA: it would land on the wrapper", () => {
    const control = (field: FormFieldBinding) => <TextInput field={field} />;
    void (
      (
        // @ts-expect-error -- pass aria-describedby to the control, which merges it
        <FormField label="Email" aria-describedby="hint">
          {control}
        </FormField>
      )
    );
    void (
      (
        // @ts-expect-error -- the label names the control
        <FormField label="Email" aria-label="Email">
          {control}
        </FormField>
      )
    );
    void (
      (
        // @ts-expect-error -- use `required`
        <FormField label="Email" aria-required>
          {control}
        </FormField>
      )
    );
    void (
      (
        // @ts-expect-error -- use `error`
        <FormField label="Email" aria-invalid>
          {control}
        </FormField>
      )
    );
    void (
      <FormField label="Email">
        {(field) => <TextInput field={field} aria-describedby="hint" />}
      </FormField>
    );
  });

  test('type and size are closed unions; aria-invalid is a boolean', () => {
    expectTypeOf<TextInputSize>().toEqualTypeOf<'sm' | 'md' | 'lg'>();
    // @ts-expect-error -- number is a spin button, not a text input
    void (<TextInput aria-label="Quantity" type="number" />);
    // @ts-expect-error -- not a size
    void (<TextInput aria-label="Search" size="xl" />);
    // @ts-expect-error -- the native `size` (width in characters) is replaced
    void (<TextInput aria-label="Search" size={20} />);
    // @ts-expect-error -- "grammar" and "spelling" errors aren't styled
    void (<TextInput aria-label="Search" aria-invalid="grammar" />);
  });

  test('no colour or role props; native attributes and ref pass through', () => {
    void (
      <TextInput
        aria-label="Email"
        type="email"
        autoComplete="email"
        name="email"
        className="wide"
        ref={createRef<HTMLInputElement>()}
      />
    );
    // @ts-expect-error -- no ad-hoc re-skinning
    void (<TextInput aria-label="Search" color="hotpink" />);
    // @ts-expect-error -- the element and role are fixed (ADR-0006)
    void (<TextInput aria-label="Search" role="combobox" />);
  });

  test('a wrapper keeps the name requirement with DistributiveOmit', () => {
    const Search = (props: DistributiveOmit<TextInputProps, 'type'>) => (
      <TextInput {...props} type="search" />
    );
    void (<Search aria-label="Search" />);
    // @ts-expect-error -- still requires a name
    void (<Search />);
  });
});
