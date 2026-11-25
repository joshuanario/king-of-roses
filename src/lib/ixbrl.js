// Highlights the facts of an inline XBRL document rendered in an iframe and
// reports clicks on them. Selection state is owned by the app store; this
// module only reflects it in the document via select() / clear().

const ORANGE = '#ffa500'

const STYLE = `
.kor-fact { cursor: pointer; }
.kor-numeric {
    border-top: 1pt solid ${ORANGE};
    border-bottom: 1pt solid ${ORANGE};
}
.kor-numeric:hover {
    border-top-width: 3pt;
    border-bottom-width: 3pt;
}
.kor-narrative {
    box-shadow: -2px 0 0 0 ${ORANGE}, 2px 0 0 0 ${ORANGE};
}
.kor-narrative::before,
.kor-narrative::after {
    content: "\\00a0";
    background-color: ${ORANGE};
}
.kor-has-selection .kor-fact:not(.kor-selected):not(:hover) {
    border-color: transparent;
    box-shadow: none;
}
.kor-has-selection .kor-fact:not(.kor-selected)::before,
.kor-has-selection .kor-fact:not(.kor-selected)::after {
    content: none;
}
.kor-numeric.kor-selected {
    background-color: rgba(255, 165, 0, 0.35);
    border-top: 3pt solid ${ORANGE};
    border-bottom: 3pt solid ${ORANGE};
}
.kor-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 0;
    z-index: 2147483000;
    pointer-events: none;
}
.kor-band {
    position: absolute;
    left: 0;
    right: 0;
    background-image: linear-gradient(to right, rgba(255, 165, 0, 0), rgba(255, 165, 0, 0.5));
}
.kor-clear {
    position: absolute;
    top: 0;
    right: 4px;
    width: 20px;
    height: 20px;
    pointer-events: auto;
    border-radius: 3px;
    background: ${ORANGE};
    color: #fff;
    font: bold 14px/20px sans-serif;
    text-align: center;
    text-decoration: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
.kor-clear:hover { background: #e08e00; }
.kor-clear:focus-visible { outline: 2px solid #333; outline-offset: 1px; }
@keyframes kor-flash {
    0%, 40% { background-color: rgba(255, 165, 0, 0.9); outline: 3px solid ${ORANGE}; }
    100% { outline-color: transparent; }
}
.kor-flash { animation: kor-flash 2.4s ease-out 1; }
`

const kindOf = (el) => {
    const name = (el.localName || '').toLowerCase()
    const local = name.slice(name.lastIndexOf(':') + 1)
    if (local === 'nonfraction') return 'numeric'
    if (local === 'nonnumeric') return 'narrative'
    return null
}

// onOpenDocument(path, fragment) => boolean: handle a link to another document
// of the filing; return false to treat it as an external link.
export function attachFactLayer(doc, { onSelect, onClear, onOpenDocument }) {
    const win = doc.defaultView
    const style = doc.createElement('style')
    style.textContent = STYLE
    ;(doc.head || doc.documentElement).appendChild(style)

    const facts = []
    for (const el of doc.body.querySelectorAll('*')) {
        const kind = kindOf(el)
        if (kind) {
            el.classList.add('kor-fact', `kor-${kind}`)
            facts.push(el)
        }
    }

    const overlay = doc.createElement('div')
    overlay.className = 'kor-overlay'
    doc.body.appendChild(overlay)

    let selected = []
    let selectedKind = null

    const onClick = (ev) => {
        if (ev.target.closest?.('.kor-clear')) {
            ev.preventDefault()
            ev.stopPropagation()
            onClear()
            return
        }
        // The innermost fact or link wins (facts can be nested, and narrative
        // facts can contain links).
        let el = ev.target
        while (el && el.nodeType === 1 && !el.classList.contains('kor-fact') && !(el.localName === 'a' && el.hasAttribute('href'))) {
            el = el.parentElement
        }
        if (!el || el.nodeType !== 1) return
        ev.preventDefault()
        ev.stopPropagation()
        if (el.localName === 'a') {
            followLink(el.getAttribute('href'))
            return
        }
        onSelect({
            name: el.getAttribute('name'),
            contextref: el.getAttribute('contextref'),
            kind: kindOf(el),
        })
    }
    doc.addEventListener('click', onClick, true)

    // The document is rendered from srcdoc, so its relative links would
    // resolve against the app's URL and load the app inside the iframe.
    //   "#anchor"         -> scroll to the anchor in this document
    //   "other.htm#x"     -> another inline XBRL document of the filing
    //   anything else     -> alert: the file has no inline XBRL to show
    const scrollToAnchor = (fragment) => {
        let id = fragment
        try {
            id = decodeURIComponent(fragment)
        } catch {
            // keep it as written
        }
        const target = doc.getElementById(id) || doc.getElementsByName(id)[0]
        target?.scrollIntoView({ block: 'start' })
    }
    const followLink = (href) => {
        const value = (href || '').trim()
        if (!value || value === '#') return
        if (value.startsWith('#')) {
            scrollToAnchor(value.slice(1))
            return
        }
        const [path, fragment] = value.split('#')
        if (!/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith('//') && onOpenDocument?.(path, fragment)) {
            return
        }
        let file = path
        try {
            file = decodeURIComponent(path.split('/').filter(Boolean).pop() || path)
        } catch {
            // keep it as written
        }
        window.alert(`The linked file "${file}" cannot be opened because it has no inline XBRL.`)
    }

    const docRect = (el) => {
        const r = el.getBoundingClientRect()
        return { top: r.top + win.scrollY, bottom: r.bottom + win.scrollY, right: r.right + win.scrollX }
    }

    // A narrative fact may continue elsewhere via ix:continuation elements.
    const narrativeExtent = (el) => {
        let { top, bottom } = docRect(el)
        const seen = new Set()
        let next = el.getAttribute('continuedat')
        while (next && !seen.has(next)) {
            seen.add(next)
            const continuation = doc.getElementById(next)
            if (!continuation) break
            bottom = Math.max(bottom, docRect(continuation).bottom)
            next = continuation.getAttribute('continuedat')
        }
        return { top, bottom }
    }

    const clearLink = () => {
        const a = doc.createElement('a')
        a.href = '#'
        a.className = 'kor-clear'
        a.title = 'Clear fact inspector'
        a.setAttribute('aria-label', 'Clear fact inspector')
        a.textContent = '×'
        return a
    }

    // Facts inside ix:hidden (or otherwise display:none) have no layout box.
    const isRendered = (el) => el.getClientRects().length > 0

    // Every rendered occurrence of the selected fact gets its own highlight
    // and "X" link.
    const drawMarks = () => {
        overlay.replaceChildren()
        const maxLeft = doc.documentElement.scrollWidth - 22
        for (const el of selected.filter(isRendered)) {
            if (selectedKind === 'narrative') {
                const { top, bottom } = narrativeExtent(el)
                const band = doc.createElement('div')
                band.className = 'kor-band'
                band.style.top = `${top}px`
                band.style.height = `${Math.max(bottom - top, 20)}px`
                band.appendChild(clearLink())
                overlay.appendChild(band)
            } else {
                // Badge sits on the fact's top-right corner, kept inside the page.
                const r = docRect(el)
                const x = clearLink()
                x.style.top = `${Math.max(0, r.top - 22)}px`
                x.style.left = `${Math.max(0, Math.min(r.right - 20, maxLeft))}px`
                x.style.right = 'auto'
                overlay.appendChild(x)
            }
        }
    }

    const matches = (el, name, contextref) =>
        el.getAttribute('name') === name && el.getAttribute('contextref') === contextref

    let cursor = -1 // occurrence last scrolled to

    const clear = () => {
        selected.forEach((el) => el.classList.remove('kor-selected'))
        selected = []
        selectedKind = null
        cursor = -1
        doc.body.classList.remove('kor-has-selection')
        overlay.replaceChildren()
    }

    // Selects every expression of the fact (same name + contextref) in
    // document order; returns how many are rendered.
    const select = ({ name, contextref, kind }) => {
        clear()
        selectedKind = kind
        selected = facts.filter((el) => el.classList.contains(`kor-${kind}`) && matches(el, name, contextref))
        selected.forEach((el) => el.classList.add('kor-selected'))
        doc.body.classList.toggle('kor-has-selection', selected.length > 0)
        drawMarks()
        return { count: selected.filter(isRendered).length }
    }

    // Each call scrolls to the next rendered expression, wrapping around.
    // Returns the 1-based position scrolled to (0 when nothing is rendered).
    const scrollToSelection = () => {
        const rendered = selected.filter(isRendered)
        if (!rendered.length) return 0
        cursor = (cursor + 1) % rendered.length
        const el = rendered[cursor]
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        el.classList.remove('kor-flash')
        void el.offsetWidth // restart the animation
        el.classList.add('kor-flash')
        win.setTimeout(() => el.classList.remove('kor-flash'), 2400)
        return cursor + 1
    }

    win.addEventListener('resize', drawMarks)

    return {
        select,
        clear,
        scrollToSelection,
        scrollToAnchor,
        destroy: () => {
            doc.removeEventListener('click', onClick, true)
            win?.removeEventListener('resize', drawMarks)
        },
    }
}
