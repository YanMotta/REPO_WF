import { createTheme, MantineColorsTuple } from '@mantine/core';

// Brasal Refrigerantes red — 10 manual shades, lightest to darkest. Deliberately not Mantine's
// default red, per the brand identity in the project spec.
const workflow: MantineColorsTuple = [
  '#fff0f0',
  '#ffdcdc',
  '#ffb8b8',
  '#ff8f8f',
  '#fa6666',
  '#f04040',
  '#d92626',
  '#b81c1c',
  '#970f0f',
  '#850808',
];

export const theme = createTheme({
  primaryColor: 'workflow',
  colors: { workflow },
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, sans-serif',
});
