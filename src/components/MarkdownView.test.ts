import { act, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenedDocument } from "../lib/types";
import { MarkdownView } from "./MarkdownView";
import { classifyLink } from "../lib/links";

const NativeWorker = globalThis.Worker;
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<{ id: number; html?: string }>) => void) | null = null;
  messages: Array<{ id: number; markdown: string }> = [];
  constructor() { FakeWorker.instances.push(this); }
  postMessage(message: { id: number; markdown: string }) { this.messages.push(message); }
  terminate() { /* test double */ }
  respond(id: number, html: string) { this.onmessage?.({ data: { id, html } } as MessageEvent<{ id: number; html: string }>); }
}

afterEach(() => { globalThis.Worker = NativeWorker; FakeWorker.instances = []; });

describe("classifyLink", () => {
  it.each([["#install", "fragment"], ["../README.MD#use", "markdown"], ["https://example.com", "external"], ["mailto:a@example.com", "external"], ["file:///secret", "unsupported"], ["image.png", "unsupported"]])("classifies %s", (href, kind) => expect(classifyLink(href)).toBe(kind));
});

describe("MarkdownView rendering", () => {
  it("ignores a stale worker response after a newer document is requested", () => {
    globalThis.Worker = FakeWorker as unknown as typeof Worker;
    const first: OpenedDocument = { path: "C:\\first.md", filename: "first.md", content: "first", sizeBytes: 5 };
    const second: OpenedDocument = { path: "C:\\second.md", filename: "second.md", content: "second", sizeBytes: 6 };
    const props = { onOpenRelative: vi.fn(), onFeedback: vi.fn(), onRendered: vi.fn() };
    const view = render(createElement(MarkdownView, { openedDocument: first, ...props }));
    const worker = FakeWorker.instances[0]; const firstId = worker.messages[0].id;
    view.rerender(createElement(MarkdownView, { openedDocument: second, ...props })); const secondId = worker.messages[1].id;
    act(() => worker.respond(secondId, "<h1>Second</h1>")); expect(screen.getByRole("heading")).toHaveTextContent("Second");
    act(() => worker.respond(firstId, "<h1>First</h1>")); expect(screen.getByRole("heading")).toHaveTextContent("Second");
  });
});
