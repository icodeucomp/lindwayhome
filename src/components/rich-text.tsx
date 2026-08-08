import * as React from "react";

import type { RichText as RichTextDoc } from "@/types";

/**
 * Renderer for the Tiptap JSON stored by the admin (D10).
 *
 * It walks the node tree and emits React elements. It deliberately does NOT go through
 * `generateHTML` + `dangerouslySetInnerHTML`: that would put admin-authored markup
 * straight into every visitor's DOM and make a sanitizer the only thing standing
 * between a compromised admin account and stored XSS (CLAUDE.md §E6). Walking the tree
 * removes the injection surface instead of guarding it — an unknown node type renders
 * nothing rather than raw markup.
 *
 * Link hrefs are still checked, because a URL is passed through as an attribute:
 * anything that is not http(s)/mailto/tel is dropped to plain text.
 */

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
}

const SAFE_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

const safeHref = (value: unknown): string | null => {
  if (typeof value !== "string" || !value) return null;
  try {
    // A relative href has no protocol of its own; resolve against a dummy origin so
    // `/journal/x` stays valid while `javascript:` is rejected.
    const url = new URL(value, "https://lindway.invalid");
    return SAFE_PROTOCOLS.includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
};

const applyMarks = (text: React.ReactNode, marks: TiptapMark[] | undefined, key: string): React.ReactNode =>
  (marks ?? []).reduce<React.ReactNode>((node, mark, index) => {
    const markKey = `${key}-m${index}`;

    switch (mark.type) {
      case "bold":
        return <strong key={markKey}>{node}</strong>;
      case "italic":
        return <em key={markKey}>{node}</em>;
      case "underline":
        return <u key={markKey}>{node}</u>;
      case "strike":
        return <s key={markKey}>{node}</s>;
      case "code":
        return (
          <code key={markKey} className="px-1 py-0.5 text-[0.9em] bg-muted">
            {node}
          </code>
        );
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (!href) return node;
        return (
          <a key={markKey} href={href} target="_blank" rel="noopener noreferrer nofollow" className="underline text-primary underline-offset-2">
            {node}
          </a>
        );
      }
      default:
        return node;
    }
  }, text);

const renderNodes = (nodes: TiptapNode[] | undefined, keyPrefix: string): React.ReactNode[] =>
  (nodes ?? []).map((node, index) => renderNode(node, `${keyPrefix}-${index}`));

const renderNode = (node: TiptapNode, key: string): React.ReactNode => {
  switch (node.type) {
    case "text":
      return <React.Fragment key={key}>{applyMarks(node.text ?? "", node.marks, key)}</React.Fragment>;

    case "paragraph":
      return <p key={key}>{renderNodes(node.content, key)}</p>;

    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 2, 1), 6);
      const Tag = `h${level}` as React.ElementType;
      return (
        <Tag key={key} className="font-heading text-primary">
          {renderNodes(node.content, key)}
        </Tag>
      );
    }

    case "bulletList":
      return (
        <ul key={key} className="pl-5 space-y-1 list-disc">
          {renderNodes(node.content, key)}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key} className="pl-5 space-y-1 list-decimal">
          {renderNodes(node.content, key)}
        </ol>
      );

    case "listItem":
      return <li key={key}>{renderNodes(node.content, key)}</li>;

    case "blockquote":
      return (
        <blockquote key={key} className="pl-4 border-l-2 border-primary/50 text-body/85">
          {renderNodes(node.content, key)}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre key={key} className="p-4 overflow-x-auto text-sm bg-muted">
          <code>{renderNodes(node.content, key)}</code>
        </pre>
      );

    case "hardBreak":
      return <br key={key} />;

    case "horizontalRule":
      return <hr key={key} className="border-border" />;

    case "image": {
      const src = safeHref(node.attrs?.src);
      if (!src) return null;
      // Editor-embedded images are arbitrary URLs, so next/image cannot be used here
      // without a matching remotePatterns entry; a plain img keeps them working.
      // eslint-disable-next-line @next/next/no-img-element
      return <img key={key} src={src} alt={typeof node.attrs?.alt === "string" ? node.attrs.alt : ""} className="w-full h-auto" />;
    }

    case "doc":
      return <React.Fragment key={key}>{renderNodes(node.content, key)}</React.Fragment>;

    default:
      // Unknown node: render its children if it has any, otherwise nothing.
      return node.content ? <React.Fragment key={key}>{renderNodes(node.content, key)}</React.Fragment> : null;
  }
};

/** True when the document has no renderable text — an empty editor still emits a doc. */
export const isRichTextEmpty = (value: RichTextDoc | null | undefined): boolean => richTextToPlain(value).trim().length === 0;

/** Flattens a document to plain text, for excerpts and meta descriptions. */
export const richTextToPlain = (value: RichTextDoc | null | undefined): string => {
  const walk = (node: TiptapNode): string => {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return " ";
    return (node.content ?? []).map(walk).join(node.type === "paragraph" || node.type === "listItem" ? "" : "");
  };

  if (!value) return "";
  return (value as TiptapNode).content?.map((node) => walk(node)).join(" ") ?? "";
};

export const RichText = ({ value, className }: { value: RichTextDoc | null | undefined; className?: string }) => {
  if (!value || isRichTextEmpty(value)) return null;

  return <div className={`space-y-3 [&_a]:break-words ${className ?? ""}`}>{renderNode(value as TiptapNode, "rt")}</div>;
};
