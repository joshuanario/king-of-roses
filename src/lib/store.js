import { batch, createEffect, createMemo, createResource, createRoot, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'

import * as api from './api'
import { NETWORKS, formatHash, parseHash } from './router'
import { LINKBASES } from './linkbases'
import { narrativeHtml, periodText, pickLabel } from './labels'

export { NETWORKS }

export const entityKey = (subject) => `${subject.Entity.Scheme}/${subject.Entity.CharData}`

// Value of a resource without throwing while it is errored; keeps the previous
// value while a new request is in flight.
const ready = (resource) => (resource.state === 'errored' ? undefined : resource.latest)

function createAppStore() {
    const route = parseHash()
    const [ui, setUi] = createStore({
        tab: route.tab,
        view: route.view || 'presentation',
        entity: route.entity || null,
        roleURI: route.roleURI || null,
        labelRole: 'Default',
        lang: 'Truncated',
    })

    // ---- catalog / documents -------------------------------------------------
    const [catalog, { refetch: reloadCatalog }] = createResource(api.fetchCatalog)
    const catalogData = () => ready(catalog)

    // Inline XBRL documents of the filing (file names).
    const documents = createMemo(() => [...new Set((catalogData()?.Documents || []).filter(Boolean))])

    // ---- network (renderable) ------------------------------------------------
    const hash = createMemo(() => catalogData()?.Networks?.[ui.entity]?.[ui.roleURI] ?? null)
    const [renderable, { refetch: reloadRenderable }] = createResource(hash, api.fetchRenderable)
    const renderableData = () => (hash() ? ready(renderable) : undefined)

    // ---- fact inspector (inline XBRL tabs) -----------------------------------
    const [fact, setFact] = createSignal(null) // { document, name, contextref, kind }
    const [expressable, { refetch: reloadExpressable }] = createResource(
        fact, (f) => api.fetchExpressable(f.document, f.name, f.contextref))
    const expressableData = () => (fact() ? ready(expressable) : undefined)

    // ---- narrative / footnotes side panel (Networks grids) --------------------
    // { kind: 'narrative' | 'footnotes', linkbase, part, row, col, hash }
    const [detail, setDetail] = createSignal(null)

    const detailContent = createMemo(() => {
        const d = detail()
        if (!d) return null
        const { labelRole: role, lang } = ui
        if (d.hash !== hash()) return null
        const linkbase = LINKBASES[d.linkbase]
        const part = linkbase.parts(renderableData())[d.part]
        if (!part) return null
        const ids = part.FootnoteGrid?.[d.row]?.[d.col] || []
        return {
            label: pickLabel(linkbase.rowLabel(part, d.row), role, lang),
            period: periodText(part.PeriodHeaders?.[d.col], lang),
            narrative: narrativeHtml(part.FactualQuadrant?.[d.row]?.[d.col], lang),
            footnotes: ids.map((n) => ({ n, html: part.Footnotes?.[n - 1] || '' })),
        }
    })

    // ---- keep the selection valid once the catalog is known ------------------
    createEffect(() => {
        const c = catalogData()
        if (!c) return
        const subjects = c.Subjects || []
        if (!subjects.some((s) => entityKey(s) === ui.entity)) {
            setUi('entity', subjects[0] ? entityKey(subjects[0]) : null)
        }
        const networks = c.Networks?.[ui.entity] || {}
        if (!ui.roleURI || !(ui.roleURI in networks)) {
            const first = (c.RelationshipSets || []).find((r) => r.RoleURI in networks)
            setUi('roleURI', first?.RoleURI ?? null)
        }
        if (ui.tab !== NETWORKS && !documents().includes(ui.tab)) {
            setUi('tab', NETWORKS)
        }
    })

    // ---- URL <-> state -------------------------------------------------------
    createEffect(() => {
        const next = formatHash(ui)
        if (next === window.location.hash) return
        const current = parseHash()
        const isNavigation = current.tab !== ui.tab || (current.view && current.view !== ui.view)
        window.history[isNavigation ? 'pushState' : 'replaceState'](null, '', next)
    })
    window.addEventListener('hashchange', () => {
        const r = parseHash()
        batch(() => {
            if (r.tab !== ui.tab) setDetail(null)
            setUi('tab', r.tab)
            if (r.view) setUi('view', r.view)
            if (r.entity) setUi('entity', r.entity)
            if (r.roleURI) setUi('roleURI', r.roleURI)
        })
    })

    const closeGridDetail = () => setDetail(null)

    return {
        ui,
        catalog,
        catalogData,
        reloadCatalog,
        documents,
        hash,
        renderable,
        renderableData,
        reloadRenderable,
        fact,
        expressable,
        expressableData,
        reloadExpressable,
        detail,
        detailContent,

        openTab: (tab) => batch(() => {
            setDetail(null)
            setUi('tab', tab)
        }),
        setView: (view) => setUi('view', view),
        setEntity: (entity) => batch(() => {
            setUi('entity', entity)
            closeGridDetail()
        }),
        setRoleURI: (roleURI) => batch(() => {
            setUi('roleURI', roleURI)
            closeGridDetail()
        }),
        setLabel: (labelRole, lang) => setUi({ labelRole, lang }),

        selectFact: (f) => setFact(f),
        clearFact: () => setFact(null),

        openDetail: (d) => setDetail({ ...d, hash: hash() }),
        setDetailKind: (kind) => setDetail((d) => (d ? { ...d, kind } : d)),
        closeDetail: () => setDetail(null),
    }
}

export default createRoot(createAppStore)
