import '@mantine/core/styles.css';
import React from 'react';
import { MantineProvider } from '@mantine/core';

import { theme } from '../config/mantineTheme'
export const decorators = [
  (renderStory) => <MantineProvider theme={theme}>{renderStory()}</MantineProvider>,
];