const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro's package-exports resolution (default since Expo SDK 54) picks
// zustand/middleware's ESM build, which references `import.meta.env` for its
// (unused) devtools export. Metro doesn't serve modules as real ES modules,
// so `import.meta` is a hard SyntaxError that crashes the whole bundle before
// anything renders. The CJS build has no such reference. Falling back to
// main/browser-field resolution avoids this.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
