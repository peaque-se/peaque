// Head management types for custom meta tags, icons, and head elements
export interface HeadDefinition {
  title?: string
  meta?: Array<{
    name?: string
    property?: string
    httpEquiv?: string
    charset?: string
    content?: string
  }>
  link?: Array<{
    rel: string
    href: string
    as?: string
    type?: string
    sizes?: string
    media?: string
    crossOrigin?: "anonymous" | "use-credentials" | ""
  }>
  script?: Array<{
    src?: string
    type?: string
    async?: boolean
    defer?: boolean
    innerHTML?: string
  }>
  style?: Array<{
    type?: string
    innerHTML: string
  }>
  extra?: Array<Record<string, any>>
}

export function mergeHead(parent: HeadDefinition, child: HeadDefinition): HeadDefinition {
  const result: HeadDefinition = {}

  if (child.title) {
    result.title = child.title
  } else if (parent.title) {
    result.title = parent.title
  }

  // --- Meta
  result.meta = mergeByKey(parent.meta, child.meta, (a, b) => (a.name && b.name ? a.name === b.name : a.property && b.property ? a.property === b.property : a.httpEquiv && b.httpEquiv ? a.httpEquiv === b.httpEquiv : false))

  // --- Link (dedupe by rel+href)
  result.link = mergeByKey(parent.link, child.link, (a, b) => a.rel === b.rel && a.href === b.href)

  // --- Script (dedupe by src)
  result.script = mergeByKey(parent.script, child.script, (a, b) => (a.src && b.src ? a.src === b.src : false))

  // --- Style (dedupe by innerHTML + type)
  result.style = mergeByKey(parent.style, child.style, (a, b) => a.type === b.type && a.innerHTML === b.innerHTML)

  // --- Extra (just concat)
  result.extra = [...(parent.extra ?? []), ...(child.extra ?? [])]

  return result
}

/**
 * Utility to merge arrays with de-duplication and child override
 */
function mergeByKey<T>(parentArr: T[] | undefined, childArr: T[] | undefined, same: (a: T, b: T) => boolean): T[] {
  const result: T[] = []

  if (parentArr) {
    result.push(...parentArr)
  }

  if (childArr) {
    for (const c of childArr) {
      // Check if it matches something in parent
      const idx = result.findIndex((p) => same(p, c))
      if (idx >= 0) {
        result[idx] = c // override
      } else {
        result.push(c) // append
      }
    }
  }

  return result
}

export function renderHead(head: HeadDefinition, assetPrefix: string = ""): string {
  const parts: string[] = []

  function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
  }

  function prefixAssetUrl(url: string): string {
    // Only prefix URLs that start with / and don't already have the prefix
    if (assetPrefix && url.startsWith('/') && !url.startsWith('//') && !url.startsWith(assetPrefix)) {
      return assetPrefix + url
    }
    return url
  }

  if (head.title) {
    parts.push(`<title>${escapeHtml(head.title)}</title>`)
  }
  if (head.meta) {
    for (const m of head.meta) {
      const attrs = Object.entries(m)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => (v === "" ? k : `${k}="${escapeHtml(v as string)}"`))
        .join(" ")
      parts.push(`<meta ${attrs}>`)
    }
  }
  if (head.link) {
    for (const l of head.link) {
      const attrs = Object.entries(l)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => {
          // Prefix href attributes with asset path
          if (k === 'href' && typeof v === 'string') {
            return `${k}="${escapeHtml(prefixAssetUrl(v))}"`
          }
          if (v === "" || typeof v === 'boolean') return k
          return `${k}="${escapeHtml(String(v))}"`
        })
        .join(" ")
      parts.push(`<link ${attrs}>`)
    }
  }
  if (head.script) {
    for (const s of head.script) {
      const { innerHTML, ...attrsObj } = s
      const attrs = Object.entries(attrsObj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => {
          // Prefix src attributes with asset path
          if (k === 'src' && typeof v === 'string') {
            return `${k}="${escapeHtml(prefixAssetUrl(v))}"`
          }
          if (v === "" || typeof v === 'boolean') return k
          return `${k}="${escapeHtml(String(v))}"`
        })
        .join(" ")
      if (innerHTML) {
        parts.push(`<script ${attrs}>${innerHTML}</script>`)
      } else {
        parts.push(`<script ${attrs}></script>`)
      }
    }
  }
  if (head.style) {
    for (const s of head.style) {
      const { innerHTML, ...attrsObj } = s
      const attrs = Object.entries(attrsObj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => (v === "" ? k : `${k}="${escapeHtml(v as string)}"`))
        .join(" ")
      parts.push(`<style ${attrs}>${innerHTML}</style>`)
    }
  }
  return parts.join("\n")
}
