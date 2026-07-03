---
name: pnpm phantom Babel dependency breaks Expo/Metro after version bumps
description: Bumping @babel/core in an Expo/RN pnpm workspace can crash Metro with "Cannot find module '@babel/generator'" — fix by adding the missing package as an explicit devDependency.
---

Some Expo/React Native Babel plugins (e.g. `react-native-worklets`'s babel plugin, transitively required by `babel-preset-expo`) `require("@babel/generator")` directly without declaring it in their own `package.json` dependencies. They rely on it being reachable via loose/hoisted resolution.

**Why:** pnpm's default strict `node_modules` isolation only exposes a package's own declared dependencies. Bumping `@babel/core` (e.g. for a security fix) can shift the resolved dependency graph enough that this phantom `@babel/generator` require stops resolving, crashing Metro/expo start with `Cannot find module '@babel/generator'` — even though `@babel/core` itself always depends on `@babel/generator` internally.

**How to apply:** If an Expo mobile app's Metro bundler crashes with a "Cannot find module '@babel/...'" error after bumping `@babel/core` (or other core Babel packages), add the missing package as an explicit `devDependency` in that artifact's `package.json` (pin the version to match the installed `@babel/core` major/minor, e.g. `@babel/generator@^7.29.7`) rather than trying to edit `node_modules` or revert the bump. Verify by restarting the Expo workflow and confirming Metro starts without the module-resolution error.
