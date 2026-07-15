import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { assetUrl } from '../lib/cover'

// Extend the safe schema so GFM footnotes (annotations) keep their ids/links,
// and images survive sanitizing.
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'section', 'sup', 'sub'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes['*'] || []), 'id', 'className'],
    a: [...(defaultSchema.attributes.a || []), 'ariaLabel', 'dataFootnoteRef', 'dataFootnoteBackref'],
    li: [...(defaultSchema.attributes.li || []), 'id'],
    section: [...(defaultSchema.attributes.section || []), 'dataFootnotes'],
    img: ['src', 'alt', 'title']
  }
}

function isAbsolute(src) {
  return /^(https?:|data:|asset:|blob:|mailto:|#)/i.test(src || '')
}

/**
 * Safe markdown renderer shared by the reader and previews.
 * `bookId` lets relative image paths (assets/…) resolve to the asset:// protocol.
 */
export default function MarkdownView({ children, bookId }) {
  const resolveSrc = (src) => (isAbsolute(src) ? src : assetUrl(bookId, src) || src)

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, schema]]}
      components={{
        img: ({ node, ...props }) => <img {...props} src={resolveSrc(props.src)} alt={props.alt || ''} />,
        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />
      }}
    >
      {children || ''}
    </ReactMarkdown>
  )
}
