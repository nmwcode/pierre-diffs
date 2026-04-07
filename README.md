# @tanvesh01/pierre-diffs

Pierre-themed inline diff rendering for Pi.

This package replaces Pi's default `edit` and `write` result rendering with a Pierre-styled diff block while keeping the rest of Pi's chat UI unchanged.

## What It Does

- Replaces inline `edit` and `write` tool result rendering
- Builds real before/after diffs from file contents
- Uses `@pierre/diffs` for diff modeling and highlighting
- Uses `@pierre/theme` for Pierre dark/light palettes
- Keeps Pi's compact inline diff shape instead of switching to a separate full-screen viewer

## Install

### npm

```bash
pi install npm:@tanvesh01/pierre-diffs@0.2.1
```

### git

```bash
pi install git:github.com/tanvesh01/pierre-diffs@v0.2.1
```

### local development

```bash
pi --no-extensions -e ./extensions/diff-viewer/index.ts
```

## Behavior

After install, Pi will render `edit` and `write` results with:

- a Pierre-themed title row
- Pierre-owned full-width diff backgrounds
- syntax-aware highlighted diff lines when available
- compact inline context/add/remove rows inside the chat stream

Older sessions created before the full Pierre payload existed continue to render with Pi's original stored tool result UI. Older Pierre-backed sessions can lazily recompute syntax highlighting when they are reopened.

## Scope

This package changes only:

- `edit`
- `write`

Everything else in Pi keeps its normal rendering and behavior.

## Compatibility

- Tested against `@mariozechner/pi-coding-agent` `0.65.2`
- Built as a Pi package with a `pi.extensions` manifest
- Internally patches Pi's `ToolExecutionComponent` for `edit` and `write` so Pi's host success/error/pending background does not show behind the Pierre block

Because this package patches Pi internals for those two tools, future Pi internal UI changes may require updates here.

## How It Works

1. Re-registers Pi's built-in `edit` and `write` tools
2. Delegates actual file mutation to Pi's original tool implementations
3. Captures file contents before and after the tool runs
4. Builds normalized diff metadata with `@pierre/diffs`
5. Precomputes Pierre-highlighted diff output for dark and light themes
6. Renders a Pierre-owned inline tool block inside Pi's chat stream

## Development

Install dependencies:

```bash
npm install
```

Type-check the extension:

```bash
npx tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck extensions/diff-viewer/index.ts
```

Preview the package contents before publish:

```bash
npm pack --dry-run
```

## License

MIT
