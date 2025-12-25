# 📦 Publishing Guide

This guide describes how to publish `senuks-boilerplate` to the npm registry.

## Prerequisites

1.  **npm Account**: You need an account on [npmjs.com](https://www.npmjs.com/).
2.  **Login**: Ensure you are logged in to npm in your terminal.
    ```bash
    npm login
    ```
    (Follow the interactive prompts to authenticate via browser or token).

## Publishing Steps

### 1. Update Version
Always increment the version number before publishing. You can use `npm version` to do this automatically and create a git tag.

-   **Patch** (bug fixes): `1.0.0` -> `1.0.1`
    ```bash
    npm version patch
    ```
-   **Minor** (new features): `1.0.0` -> `1.1.0`
    ```bash
    npm version minor
    ```
-   **Major** (breaking changes): `1.0.0` -> `2.0.0`
    ```bash
    npm version major
    ```

### 2. Build the Project
Ensure the latest code is compiled to JavaScript in the `dist` folder.
```bash
npm run build
```

### 3. Test the Build (Optional)
You can link the package locally to test exactly what will be published.
```bash
npm link
boilerplates
```
(When done, run `npm unlink -g senuks-boilerplate` to clean up).

### 4. Publish
Push the package to the public npm registry.
```bash
npm publish --access public
```

## Post-Publishing

-   **Verify**: Go to `https://www.npmjs.com/package/senuks-boilerplate` to see your new version.
-   **Test Install**: Try installing it on a different machine or folder:
    ```bash
    npx senuks-boilerplate@latest
    ```
