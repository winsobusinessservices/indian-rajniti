"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { editorHtmlFromStored, sanitizeRichText } from "@/lib/richText";

function ToolbarButton({ active = false, disabled = false, label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-outline-variant/40 bg-surface text-on-surface hover:border-primary hover:bg-primary-fixed"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, placeholder = "Start writing…", minHeight = "18rem", maxHeight = "42rem", disabled = false }) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
        },
      }),
    ],
    content: editorHtmlFromStored(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "tiptap rich-text min-h-[var(--editor-min-height)] px-4 py-3 focus:outline-none",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(sanitizeRichText(currentEditor.getHTML())),
  });

  useEffect(() => {
    if (!editor) return;
    const next = editorHtmlFromStored(value);
    if (editor.getHTML() !== next) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) {
    return <div className="min-h-72 animate-pulse rounded-lg border border-outline-variant/40 bg-surface-container-low" />;
  }

  const openLinkDialog = () => {
    setLinkUrl(editor.getAttributes("link").href || "");
    setLinkError("");
    setLinkDialogOpen(true);
  };

  const closeLinkDialog = () => {
    setLinkDialogOpen(false);
    setLinkError("");
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      setLinkError("Enter a website address.");
      return;
    }

    const normalizedUrl = /^(?:https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`;
    try {
      const parsed = new URL(normalizedUrl);
      if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) throw new Error();
    } catch {
      setLinkError("Enter a valid website address.");
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: normalizedUrl }).run();
    closeLinkDialog();
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    closeLinkDialog();
  };

  return (
    <div
      className="relative rounded-lg border border-outline-variant/40 bg-surface focus-within:border-primary"
      style={{ "--editor-min-height": minHeight, "--editor-max-height": maxHeight }}
    >
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1.5 rounded-t-lg border-b border-outline-variant/40 bg-surface-container-low px-2 py-2 shadow-sm" role="toolbar" aria-label="Rich text formatting">
        <ToolbarButton label="Paragraph" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>P</ToolbarButton>
        <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><strong>H2</strong></ToolbarButton>
        <ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><strong>H3</strong></ToolbarButton>
        <span className="mx-0.5 h-6 w-px bg-outline-variant/60" aria-hidden="true" />
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolbarButton>
        <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolbarButton>
        <ToolbarButton label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolbarButton>
        <span className="mx-0.5 h-6 w-px bg-outline-variant/60" aria-hidden="true" />
        <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><i className="fa-solid fa-list-ul" /></ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><i className="fa-solid fa-list-ol" /></ToolbarButton>
        <ToolbarButton label="Block quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><i className="fa-solid fa-quote-left" /></ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={openLinkDialog}><i className="fa-solid fa-link" /></ToolbarButton>
        <ToolbarButton label="Remove link" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}><i className="fa-solid fa-link-slash" /></ToolbarButton>
        <span className="mx-0.5 h-6 w-px bg-outline-variant/60" aria-hidden="true" />
        <ToolbarButton label="Undo" disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}><i className="fa-solid fa-rotate-left" /></ToolbarButton>
        <ToolbarButton label="Redo" disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}><i className="fa-solid fa-rotate-right" /></ToolbarButton>
      </div>
      {linkDialogOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="rich-text-link-title"
          className="relative z-30 m-2 ml-auto w-[calc(100%-1rem)] max-w-sm rounded-lg border border-outline-variant/40 bg-surface p-4 shadow-2xl"
          onKeyDown={(event) => {
            if (event.key === "Escape") closeLinkDialog();
            if (event.key === "Enter") {
              event.preventDefault();
              applyLink();
            }
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p id="rich-text-link-title" className="font-label-md text-sm font-semibold text-on-surface">Add website link</p>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">The selected text will open this address.</p>
            </div>
            <button type="button" onClick={closeLinkDialog} aria-label="Close link dialog" className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
          <label htmlFor="rich-text-link-url" className="mb-1.5 block font-label-md text-xs text-on-surface-variant">Website address</label>
          <input
            id="rich-text-link-url"
            type="text"
            inputMode="url"
            autoFocus
            value={linkUrl}
            onChange={(event) => {
              setLinkUrl(event.target.value);
              setLinkError("");
            }}
            placeholder="https://example.com"
            className="w-full rounded-md border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
          />
          {linkError && <p className="mt-1.5 text-xs text-error" role="alert">{linkError}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {editor.isActive("link") && (
              <button type="button" onClick={removeLink} className="mr-auto rounded-md px-3 py-2 text-xs font-semibold text-error hover:bg-error/5">Remove link</button>
            )}
            <button type="button" onClick={closeLinkDialog} className="rounded-md border border-outline-variant/40 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container">Cancel</button>
            <button type="button" onClick={applyLink} className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container">Apply link</button>
          </div>
        </div>
      )}
      <div className="rich-text-editor-content overflow-hidden rounded-b-lg">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
