# Node setup

This imported Grok prototype is set up to use portable Node.js 22.23.3 installed at:

`C:\hermes\moongeometry\tools\node-v22.23.3-win-x64`

From Git Bash / Hermes terminal, activate it with:

```sh
export PATH='/c/hermes/moongeometry/tools/node-v22.23.3-win-x64':$PATH
node --version
npm --version
```

Expected versions:

```text
v22.23.3
10.9.9
```

The app source extracted from `moon-path-source.zip` is located in:

`C:\hermes\moongeometry\app`

Auth is disabled for this standalone prototype by the committed file:

`app/.grok/app-env.json`

with:

```json
{
  "VITE_AUTH_ENABLED": "false"
}
```

If running from another checkout path, install Node 22 by your preferred method or put a Node 22 binary first on `PATH`; the portable path above is only this workstation's local setup.
