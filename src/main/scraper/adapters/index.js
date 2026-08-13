import { wikidichAdapter } from './wikidich.js'

// Site-specific adapters, checked in order before the generic Readability
// fallback. Two ways to add a site:
//
//  - Simple sites (TOC + chapters all in the server HTML): one selector
//    config via createSelectorAdapter from './selector-adapter.js':
//
//      createSelectorAdapter({
//        id: 'example',
//        name: 'Example',
//        hosts: ['example.com'],
//        titleSel: 'h1.title',
//        authorSel: '.author-name',
//        coverSel: '.book-cover img',
//        chapterLinkSel: '#chapter-list a',
//        chapterTitleSel: 'h2.chapter-title',
//        chapterContentSel: '#chapter-content'
//      }),
//
//  - Sites that need custom logic (AJAX chapter lists, signed requests,
//    politeness delays): a hand-written adapter module like './wikidich.js'.

export const siteAdapters = [wikidichAdapter]
