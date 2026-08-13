import { defineConfig, globalIgnores } from 'eslint/config'
import expo from 'eslint-config-expo/flat.js'

export default defineConfig([
  globalIgnores(['node_modules/', '.expo/', 'dist/', 'components/']),
  ...expo,
])
