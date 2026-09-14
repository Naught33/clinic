export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // scope is optional — not every commit needs one
    "scope-enum": [0],
    // type is required and must be conventional
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
  },
};
