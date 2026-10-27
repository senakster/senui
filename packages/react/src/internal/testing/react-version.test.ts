import { version } from 'react';
import { version as domVersion } from 'react-dom';
import { test } from 'vitest';
import { expectReactVersion } from './react-version.js';

// The unit project's half of decision 9a; the ssr and browser projects check their own React.
test('resolves the React the run expects', () => {
  expectReactVersion({ react: version, 'react-dom': domVersion });
});
