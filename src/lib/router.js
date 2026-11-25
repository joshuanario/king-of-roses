// Hash routing keeps the folder `?id=` query and the relative `folders/...`
// API paths working no matter which view is open.
//
//   #/networks/<view>?entity=<scheme/id>&rset=<roleURI>
//   #/doc/<document name>

export const NETWORKS = 'networks'
export const VIEWS = ['presentation', 'definition', 'calculation', 'label']

export function parseHash(hash = window.location.hash) {
    const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
    const [head, ...rest] = path.split('/')
    if (head === 'doc' && rest.length) {
        return { tab: decodeURIComponent(rest.join('/')) }
    }
    const params = new URLSearchParams(query)
    return {
        tab: NETWORKS,
        view: VIEWS.includes(rest[0]) ? rest[0] : 'presentation',
        entity: params.get('entity') || undefined,
        roleURI: params.get('rset') || undefined,
    }
}

export function formatHash({ tab, view, entity, roleURI }) {
    if (tab !== NETWORKS) {
        return `#/doc/${encodeURIComponent(tab)}`
    }
    const params = new URLSearchParams()
    if (entity) params.set('entity', entity)
    if (roleURI) params.set('rset', roleURI)
    const query = params.toString()
    return `#/networks/${view}${query ? `?${query}` : ''}`
}
