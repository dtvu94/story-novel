import { createSelectorAdapter } from './selector-adapter.js'

// Site-specific adapters. Each is one selector config. To support a new site,
// verify its markup in the browser dev-tools, fill the selectors, add its host,
// and it activates automatically (the registry checks these before the generic
// Readability fallback).
//
// Example template for a table-of-contents based novel site (selectors are
// placeholders — confirm against the live site during implementation):
//
//   createSelectorAdapter({
//     id: 'wikidich',
//     name: 'WikiDich / WikiCV',
//     hosts: ['wikidich', 'wikicv.org'],
//     titleSel: 'h1.title',
//     authorSel: '.author-name',
//     coverSel: '.book-cover img',
//     chapterLinkSel: '#chapter-list a',
//     chapterTitleSel: 'h2.chapter-title',
//     chapterContentSel: '#chapter-content'
//   }),

export const siteAdapters = [
  // (none configured yet — generic Readability fallback handles all URLs)
]
