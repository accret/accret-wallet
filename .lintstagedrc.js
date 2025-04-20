module.exports = {
  "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
  // Don't try to run tests as part of the pre-commit hook
  // "**/*.{js,jsx,ts,tsx}": () => "jest --bail --findRelatedTests",
};
