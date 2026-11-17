## 1. The default and the wording

- [x] 1.1 Set `DEFAULT_SETTINGS.genealogyInterface` to `true` in `src/settingsData.ts`, and in `src/settings.test.ts` expect it in the defaults, expect `true` for a settings file without the key and for a value that is not a boolean, and `false` kept for a saved `false`; verify with `npm run test`
- [x] 1.2 Keep the setting's name and beta description in `src/i18n/en.json` and `src/i18n/ru.json`, and expect the definition with `defaultValue: true` in `src/settings.test.ts`; verify with `npm run test`

## 2. Documentation

- [x] 2.1 In `README.md`, describe the interface as on by default and turned off in the plugin settings, without calling it optional, and still as a beta; verify by reading the Features and Usage sections

## 3. Verification

- [x] 3.1 Run `npm run openspec:validate`, `npm run check` and `npm run test:browser`, each exiting 0
