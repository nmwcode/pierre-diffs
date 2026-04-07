/**
 * Pi Diff Viewer Extension
 * Replaces inline diff rendering for edit and write tools with Pierre-owned inline blocks.
 */

import type { AgentToolResult, ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { ToolExecutionComponent, createEditToolDefinition, createWriteToolDefinition } from "@mariozechner/pi-coding-agent";
import { InlineDiffComponent, PierreCallComponent, PierreStatusComponent } from "./components/DiffViewer.js";
import { createEditSnapshots, createWriteSnapshot } from "./lib/content-snapshot.js";
import { loadHighlightedDiff } from "./lib/pierreHighlight.js";
import { buildDiffMetadata } from "./lib/pierreParser.js";
import type { DiffViewerDetails, DiffViewerPayload } from "./types.js";

export default function (pi: ExtensionAPI) {
  installPierreToolWrapperPatch();

  const cwd = process.cwd();
  const originalEdit = createEditToolDefinition(cwd);
  const originalWrite = createWriteToolDefinition(cwd);

  pi.registerTool({
    name: "edit",
    label: originalEdit.label,
    description: originalEdit.description,
    parameters: originalEdit.parameters,
    promptSnippet: originalEdit.promptSnippet,
    promptGuidelines: originalEdit.promptGuidelines,
    prepareArguments: originalEdit.prepareArguments,

    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const snapshotState = await createEditSnapshots(cwd, params.path);
      const result = await originalEdit.execute(toolCallId, params, signal, onUpdate, ctx);
      if (resultLooksLikeError(result)) {
        return result;
      }

      try {
        const snapshot = await snapshotState.finish();
        const metadata = buildDiffMetadata(snapshot);
        const highlighted = await loadHighlightedDiff(metadata);
        return attachDiffViewerPayload(result, { snapshot, metadata, highlighted });
      } catch {
        return result;
      }
    },

    renderCall(args, theme) {
      return new PierreCallComponent("edit", args.path, theme);
    },

    renderResult(result, options, theme, context) {
      if (options.isPartial) {
        return new PierreStatusComponent(theme, "Editing...", "pending");
      }

      const error = getErrorMessage(result);
      if (error) {
        return new PierreStatusComponent(theme, error, "error");
      }

      const payload = getDiffViewerPayload(result);
      if (hasFullPierrePayload(payload)) {
        return new InlineDiffComponent(payload, theme, maxVisibleLines(options.expanded));
      }

      if (originalEdit.renderResult) {
        return originalEdit.renderResult(result as AgentToolResult<any>, options, theme, context);
      }

      return new PierreStatusComponent(theme, "Applied", "success");
    },
  });

  pi.registerTool({
    name: "write",
    label: originalWrite.label,
    description: originalWrite.description,
    parameters: originalWrite.parameters,
    promptSnippet: originalWrite.promptSnippet,
    promptGuidelines: originalWrite.promptGuidelines,
    prepareArguments: originalWrite.prepareArguments,

    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const snapshot = await createWriteSnapshot(cwd, params.path, params.content);
      const result = await originalWrite.execute(toolCallId, params, signal, onUpdate, ctx);
      if (resultLooksLikeError(result)) {
        return result;
      }

      try {
        const metadata = buildDiffMetadata(snapshot);
        const highlighted = await loadHighlightedDiff(metadata);
        return attachDiffViewerPayload(result, { snapshot, metadata, highlighted });
      } catch {
        return result;
      }
    },

    renderCall(args, theme) {
      return new PierreCallComponent("write", args.path, theme);
    },

    renderResult(result, options, theme) {
      if (options.isPartial) {
        return new PierreStatusComponent(theme, "Writing...", "pending");
      }

      const error = getErrorMessage(result);
      if (error) {
        return new PierreStatusComponent(theme, error, "error");
      }

      const payload = getDiffViewerPayload(result);
      if (hasFullPierrePayload(payload)) {
        return new InlineDiffComponent(payload, theme, maxVisibleLines(options.expanded));
      }

      if (originalWrite.renderResult) {
        return originalWrite.renderResult(result as AgentToolResult<any>, options, theme, undefined as any);
      }

      return new PierreStatusComponent(theme, "Written", "success");
    },
  });
}

function maxVisibleLines(expanded: boolean) {
  const rows = typeof process.stdout.rows === "number" ? process.stdout.rows : 40;
  const expandedLimit = Math.max(8, Math.floor(rows * 0.6));
  return expanded ? expandedLimit : Math.min(expandedLimit, 12);
}

function attachDiffViewerPayload<T>(result: AgentToolResult<T>, payload: DiffViewerPayload): AgentToolResult<T & DiffViewerDetails> {
  return {
    ...result,
    details: {
      ...(typeof result.details === "object" && result.details ? result.details : {}),
      diffViewer: payload,
    } as T & DiffViewerDetails,
  };
}

function getDiffViewerPayload<T>(result: AgentToolResult<T>) {
  const details = result.details as (T & DiffViewerDetails) | undefined;
  return details?.diffViewer;
}

function hasFullPierrePayload(payload: unknown): payload is DiffViewerPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<DiffViewerPayload> & {
    highlighted?: Record<string, unknown>;
  };

  return Boolean(
    candidate.snapshot &&
      candidate.metadata &&
      candidate.highlighted &&
      candidate.highlighted.dark &&
      candidate.highlighted.light,
  );
}

function resultLooksLikeError<T>(result: AgentToolResult<T>) {
  return Boolean(getErrorMessage(result));
}

function getErrorMessage<T>(result: AgentToolResult<T>) {
  const first = result.content[0];
  if (first?.type === "text" && first.text.startsWith("Error")) {
    return first.text.split("\n")[0];
  }
  return undefined;
}

function installPierreToolWrapperPatch() {
  const patchKey = "__piDiffViewerToolWrapperPatchInstalled";
  const globalState = globalThis as Record<string, unknown>;
  if (globalState[patchKey]) {
    return;
  }

  globalState[patchKey] = true;

  const prototype = ToolExecutionComponent.prototype as any;
  const originalUpdateDisplay = prototype.updateDisplay;

  prototype.updateDisplay = function patchedUpdateDisplay(this: any) {
    originalUpdateDisplay.call(this);

    if (this.toolName !== "edit" && this.toolName !== "write") {
      return;
    }

    if (this.contentBox) {
      this.contentBox.setBgFn?.(undefined);
      this.contentBox.paddingX = 0;
      this.contentBox.paddingY = 0;
      this.contentBox.invalidate?.();
    }

    if (this.contentText) {
      this.contentText.setCustomBgFn?.(undefined);
      this.contentText.paddingX = 0;
      this.contentText.paddingY = 0;
      this.contentText.invalidate?.();
    }
  };
}
