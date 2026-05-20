//  @ts-check

/** @type {import('prettier').Config} */
const config = {
  importOrder: [
    '^(react/(.*)$)|^(react$)',
    '^(next/(.*)$)|^(next$)',
    '',
    '^@mantine/(.*)$',
    '^@tabler/(.*)$',
    '<THIRD_PARTY_MODULES>',
    '',
    '^types$',
    '^@/env(.*)$',
    '^@/types/(.*)$',
    '^@/config/(.*)$',
    '^@/lib/(.*)$',
    '^@/hooks/(.*)$',
    '^@/(.*)$',
    '^@/components/ui/(.*)$',
    '^@/components/(.*)$',
    '^@/styles/(.*)$',
    '^@/routes/(.*)$',
    '',
    '^[./]',
  ],
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
}

export default config
