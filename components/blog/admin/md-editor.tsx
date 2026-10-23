"use client";
// MDXEditor with the toolbar a blog needs. Loaded client-side only (see post-editor.tsx).
// Emits plain GFM markdown, which is exactly what components/blog/markdown.tsx renders.
import "@mdxeditor/editor/style.css";
import {
  BlockTypeSelect, BoldItalicUnderlineToggles, CodeToggle, CreateLink, DiffSourceToggleWrapper, InsertCodeBlock,
  InsertImage, InsertTable, InsertThematicBreak, ListsToggle, MDXEditor, Separator, StrikeThroughSupSubToggles, UndoRedo,
  codeBlockPlugin, codeMirrorPlugin, diffSourcePlugin, headingsPlugin, imagePlugin, linkDialogPlugin, linkPlugin,
  listsPlugin, markdownShortcutPlugin, quotePlugin, tablePlugin, thematicBreakPlugin, toolbarPlugin, type MDXEditorMethods,
} from "@mdxeditor/editor";
import { useImperativeHandle, useRef, type Ref } from "react";
import { uploadImage } from "./upload";

const LANGS = { "": "Plain text", ts: "TypeScript", js: "JavaScript", json: "JSON", bash: "Shell", css: "CSS", html: "HTML", python: "Python", sql: "SQL" };

export default function MdEditor({ markdown, onChange, onReady, editorRef, internalLinks }: { markdown: string; onChange: (md: string) => void; onReady: (normalized: string) => void; editorRef?: Ref<MDXEditorMethods | null>; internalLinks: string[] }) {
  const ref = useRef<MDXEditorMethods>(null);
  const touched = useRef(false);
  useImperativeHandle(editorRef, () => ref.current!, []);
  const touch = () => { touched.current = true; };
  // The editor re-serializes what it loads (escapes, table padding), some of it a few frames later.
  // Until the writer actually touches the editor, a change is that normalization: report it as the
  // saved baseline so opening a post doesn't count as an edit.
  return (
    <div onKeyDownCapture={touch} onPasteCapture={touch} onDropCapture={touch} onMouseDownCapture={touch}>
    <MDXEditor
      ref={ref}
      markdown={markdown}
      onChange={(md) => (touched.current ? onChange(md) : onReady(md))}
      className="cms-md"
      contentEditableClassName="post-body cms-md-content"
      placeholder="Start writing. Type ## for a heading, - for a list, or drop in a photo."
      plugins={[
        headingsPlugin({ allowedHeadingLevels: [2, 3, 4] }),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin({ linkAutocompleteSuggestions: internalLinks }),
        imagePlugin({ imageUploadHandler: uploadImage, disableImageResize: true }),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
        codeMirrorPlugin({ codeBlockLanguages: LANGS }),
        markdownShortcutPlugin(),
        diffSourcePlugin({ viewMode: "rich-text" }),
        toolbarPlugin({
          toolbarClassName: "cms-toolbar",
          toolbarContents: () => (
            <DiffSourceToggleWrapper options={["rich-text", "source"]}>
              <UndoRedo />
              <Separator />
              <BlockTypeSelect />
              <BoldItalicUnderlineToggles options={["Bold", "Italic"]} />
              <StrikeThroughSupSubToggles options={["Strikethrough"]} />
              <CodeToggle />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
              <InsertImage />
              <InsertTable />
              <InsertThematicBreak />
              <InsertCodeBlock />
            </DiffSourceToggleWrapper>
          ),
        }),
      ]}
    />
    </div>
  );
}
