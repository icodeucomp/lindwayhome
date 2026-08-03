"use client";

import * as React from "react";

import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";

import { PiTextBBold, PiTextItalic, PiListBullets, PiListNumbers, PiTextHOne, PiTextHTwo, PiQuotes, PiLinkSimple, PiArrowUUpLeft, PiArrowUUpRight } from "react-icons/pi";

/**
 * The single rich-text editor for the whole project (D10). Tiptap stores JSON, never a
 * HTML string — every consumer persists `JSONContent` into a Json column.
 *
 * Rendering that JSON back onto a public page is admin-authored content, so it MUST be
 * sanitized at render time (CLAUDE.md §E6). This component only produces the value.
 */
export interface TiptapEditorProps {
  value?: JSONContent | null;
  onChange: (value: JSONContent | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const ToolbarButton = ({ onClick, isActive, disabled, label, children }: { onClick: () => void; isActive?: boolean; disabled?: boolean; label: string; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={isActive}
    title={label}
    className={`grid size-8 place-items-center rounded transition-colors disabled:opacity-40 ${isActive ? "bg-primary text-light" : "hover:bg-primary/10 text-body"}`}
  >
    {children}
  </button>
);

const Toolbar = ({ editor }: { editor: Editor }) => {
  const setLink = React.useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", previous ?? "https://");

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted">
      <ToolbarButton label="Bold" onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")}>
        <PiTextBBold className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")}>
        <PiTextItalic className="size-4" />
      </ToolbarButton>
      <span className="w-px h-5 mx-1 bg-border" />
      <ToolbarButton label="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })}>
        <PiTextHOne className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })}>
        <PiTextHTwo className="size-4" />
      </ToolbarButton>
      <span className="w-px h-5 mx-1 bg-border" />
      <ToolbarButton label="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")}>
        <PiListBullets className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")}>
        <PiListNumbers className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")}>
        <PiQuotes className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Link" onClick={setLink} isActive={editor.isActive("link")}>
        <PiLinkSimple className="size-4" />
      </ToolbarButton>
      <span className="w-px h-5 mx-1 bg-border" />
      <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <PiArrowUUpLeft className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <PiArrowUUpRight className="size-4" />
      </ToolbarButton>
    </div>
  );
};

export const TiptapEditor = ({ value, onChange, placeholder, disabled = false, className = "" }: TiptapEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } })],
    content: value ?? null,
    editable: !disabled,
    // Tiptap renders on the client only; without this Next warns about hydration.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-editor min-h-40 w-full px-3 py-2 focus:outline-none",
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.isEmpty ? null : instance.getJSON());
    },
  });

  // Keep the editor in sync when the form swaps documents underneath it — this is what
  // makes the EN | ID locale tab (§B3.3) work without remounting the whole form.
  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) === JSON.stringify(value ?? null)) return;
    editor.commands.setContent(value ?? null, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="border rounded border-border min-h-40 bg-muted/40" />;

  return (
    <div className={`overflow-hidden border rounded border-border bg-light ${className}`}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
