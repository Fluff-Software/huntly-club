"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { uploadEmailImage } from "@/lib/upload-actions";

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-sm font-medium transition-colors disabled:opacity-40 ${
        active ? "bg-huntly-sage/30 text-huntly-forest" : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "rich-text-editor-content min-h-[220px] rounded-b-xl border border-t-0 border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-huntly-sage",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadEmailImage(formData);
      if (result.error || !result.url) {
        setUploadError(result.error ?? "Upload failed");
        return;
      }
      editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
    } finally {
      setUploading(false);
    }
  }

  function handleLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-stone-300 bg-stone-50 px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={handleLink}>
          Link
        </ToolbarButton>
        <ToolbarButton
          label="Insert image"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Image"}
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageSelected}
        />
      </div>
      {uploadError && <div className="mt-1 text-xs text-red-600">{uploadError}</div>}
      <EditorContent editor={editor} />
      <style jsx global>{`
        .rich-text-editor-content img {
          max-width: 100%;
          height: auto;
          display: block;
        }
        .rich-text-editor-content h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0.5rem 0;
        }
        .rich-text-editor-content h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }
        .rich-text-editor-content ul {
          list-style: disc;
          padding-left: 1.25rem;
        }
        .rich-text-editor-content a {
          color: #2d5a27;
          text-decoration: underline;
        }
        .rich-text-editor-content p {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
}
