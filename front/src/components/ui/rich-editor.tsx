import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Link as LinkIcon,
  Type,
  Heading1,
  Heading2
} from 'lucide-react'
import { Button } from './button'
import { useState, useEffect } from 'react'

interface RichEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export const RichEditor = ({ 
  content, 
  onChange, 
  placeholder = "Commencez à écrire...",
  className = ""
}: RichEditorProps) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        // Désactiver le lien par défaut de StarterKit pour éviter le conflit
        link: false
      }),
      Placeholder.configure({
        placeholder
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline cursor-pointer'
        }
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 [&_ul]:list-disc [&_ul]:ml-6 [&_li]:mb-1'
      },
      // Gérer le collage de Markdown
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain')
        if (text) {
          // Détecter si c'est du Markdown simple
          const hasMarkdown = /(\*\*|__|\*|_|#|\[.*\]\(.*\)|`|>)/g.test(text)
          if (hasMarkdown) {
            // Convertir le Markdown basique en HTML
            let html = text
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/__(.*?)__/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/_(.*?)_/g, '<em>$1</em>')
              .replace(/^### (.*$)/gm, '<h3>$1</h3>')
              .replace(/^## (.*$)/gm, '<h2>$1</h2>')
              .replace(/^# (.*$)/gm, '<h1>$1</h1>')
              .replace(/`(.*?)`/g, '<code>$1</code>')
              .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
              .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
              .replace(/\n/g, '<br>')
            
            // Insérer le HTML converti
            editor?.commands.insertContent(html)
            return true // Empêcher le collage par défaut
          }
        }
        return false // Laisser le collage par défaut se faire
      }
    }
  })

  const addLink = () => {
    if (linkUrl) {
      editor?.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl('')
      setIsLinkModalOpen(false)
    }
  }

  // Mettre à jour le contenu de l'éditeur quand la prop content change
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  if (!editor) {
    return null
  }

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        {/* Formatage du texte */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          title="Gras (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
          title="Italique (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Titres */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
          title="Titre 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
          title="Titre 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`h-8 px-2 text-xs ${!editor.isActive('heading') ? 'bg-gray-200' : ''}`}
          title="Paragraphe normal"
        >
          <Type className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Listes */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          title="Liste à puces"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
          title="Liste numérotée"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        {/* Citation */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
          title="Citation"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lien */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsLinkModalOpen(true)}
          className="h-8 w-8 p-0"
          title="Ajouter un lien"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Annuler/Refaire */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0"
          title="Annuler (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0"
          title="Refaire (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Zone d'édition */}
      <div className="min-h-[300px] max-h-[500px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Modal pour les liens */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-medium mb-3">Ajouter un lien</h3>
            <input
              type="url"
              placeholder="https://exemple.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && addLink()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsLinkModalOpen(false)
                  setLinkUrl('')
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={addLink}
                disabled={!linkUrl}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
