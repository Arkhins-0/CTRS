"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import {
  Bold,
  FileUp,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Redo2,
  Table as TableIcon,
  TextQuote,
  Trash2,
  Undo2,
} from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";

/**
 * TipTap editor that plays nicely with plain server-action forms:
 * it keeps two hidden inputs in sync on every change —
 *   name          → JSON.stringify(editor.getJSON())   (source of truth)
 *   name + "_html"→ editor.getHTML()                   (sanitised server-side)
 */
export function RichTextEditor({
  name,
  initialContent,
  placeholder = "Write the story…",
}: {
  name: string;
  /** TipTap JSON document or an HTML string. */
  initialContent?: Record<string, unknown> | string | null;
  placeholder?: string;
}) {
  const [json, setJson] = useState("");
  const [html, setHtml] = useState("");
  const [importing, setImporting] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent ?? "",
    onCreate: ({ editor }) => {
      setJson(JSON.stringify(editor.getJSON()));
      setHtml(editor.getHTML());
    },
    onUpdate: ({ editor }) => {
      setJson(JSON.stringify(editor.getJSON()));
      setHtml(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "tiptap-body min-h-[360px] px-4 py-3 text-[15px] leading-relaxed outline-none",
      },
    },
  });

  async function importDocx(file: File) {
    if (!editor) return;
    setImporting(true);
    setImportError(null);
    setImportWarnings([]);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/docx-import", { method: "POST", body });
      const data = (await res.json()) as { html?: string; warnings?: string[]; error?: string };
      if (!res.ok || typeof data.html !== "string") {
        throw new Error(data.error ?? `Import failed (${res.status})`);
      }
      editor.commands.setContent(data.html, true);
      setImportWarnings(data.warnings ?? []);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="border border-line bg-surface">
      <input type="hidden" name={name} value={json} />
      <input type="hidden" name={`${name}_html`} value={html} />

      {editor ? <Toolbar editor={editor} /> : null}

      {/* .docx import lives with the toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-page px-2 py-1.5">
        <input
          ref={fileRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importDocx(f);
          }}
        />
        <button
          type="button"
          disabled={importing || !editor}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 border border-line bg-surface px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint disabled:opacity-50"
        >
          {importing ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={12} />}
          Import .docx
        </button>
        <span className="text-[11px] text-fg-muted">Replaces the current body content.</span>
        {importError ? (
          <span className="text-[11px] font-bold text-f1-red">{importError}</span>
        ) : null}
      </div>

      {importWarnings.length > 0 ? (
        <ul className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-fg">
          {importWarnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      ) : null}

      <EditorContent editor={editor} />

      {/* Placeholder + content styles for the editable surface */}
      <style>{`
        .tiptap-body p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #a3a3a8;
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap-body h2 { font-size: 1.35rem; font-weight: 900; text-transform: uppercase; margin: 1.1em 0 0.4em; letter-spacing: -0.01em; }
        .tiptap-body h3 { font-size: 1.1rem; font-weight: 700; margin: 1em 0 0.35em; }
        .tiptap-body p { margin: 0.5em 0; }
        .tiptap-body blockquote { border-left: 4px solid #e10600; padding-left: 0.9em; font-style: italic; margin: 0.8em 0; color: #37373f; }
        .tiptap-body ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .tiptap-body ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .tiptap-body a { color: #e10600; text-decoration: underline; }
        .tiptap-body img { max-width: 100%; height: auto; margin: 0.8em 0; }
        .tiptap-body img.ProseMirror-selectednode { outline: 2px solid #e10600; }
        .tiptap-body table { border-collapse: collapse; width: 100%; margin: 0.8em 0; table-layout: fixed; }
        .tiptap-body th, .tiptap-body td { border: 1px solid #e8e4e1; padding: 0.4em 0.6em; vertical-align: top; }
        .tiptap-body th { background: #f7f4f1; font-weight: 700; text-align: left; }
        .tiptap-body .selectedCell { background: rgba(225, 6, 0, 0.08); }
        .tiptap-body hr { border: none; border-top: 2px solid #e8e4e1; margin: 1em 0; }
      `}</style>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("Link URL (leave empty to remove)", previous);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line bg-page px-2 py-1.5">
      <ToolbarButton
        title="Paragraph"
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <Pilcrow size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <TextQuote size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
        <Link2 size={14} />
      </ToolbarButton>

      <MediaPicker
        triggerLabel="Image"
        triggerClassName="inline-flex items-center gap-1 border border-line bg-surface px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint"
        onSelect={(_id, url) => editor.chain().focus().setImage({ src: url }).run()}
      />

      <ToolbarButton
        title="Insert table"
        active={editor.isActive("table")}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <TableIcon size={14} />
      </ToolbarButton>
      {editor.isActive("table") ? (
        <ToolbarButton title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
          <Trash2 size={14} />
        </ToolbarButton>
      ) : null}

      <Divider />

      <ToolbarButton
        title="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={14} />
      </ToolbarButton>
      <ToolbarButton
        title="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={14} />
      </ToolbarButton>

      <span className="ml-auto hidden items-center gap-1 text-[11px] text-fg-muted sm:flex">
        <ImagePlus size={12} /> Images insert at the cursor
      </span>
    </div>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-panel" aria-hidden />;
}

function ToolbarButton({
  title,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center border transition-colors disabled:opacity-40 ${
        active
          ? "border-line bg-panel text-white"
          : "border-line bg-surface text-fg hover:border-fg-faint"
      }`}
    >
      {children}
    </button>
  );
}
