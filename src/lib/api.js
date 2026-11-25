import folderId from './id'

const base = () => `folders/${folderId()}`

async function get(path, as = 'json') {
    const response = await fetch(path)
    if (!response.ok) {
        throw new Error(`Request failed (${response.status}): ${path}`)
    }
    return as === 'text' ? response.text() : response.json()
}

export const fetchCatalog = () => get(base())

export const fetchRenderable = (hash) => get(`${base()}/${hash}`)

// Inline XBRL documents are large and immutable for a folder, so keep them
// around for the session; switching document tabs then costs nothing.
const documentCache = new Map()
export const fetchDocument = (name) => {
    if (!documentCache.has(name)) {
        const request = fetchExpressableDocument(name).catch((e) => {
            documentCache.delete(name)
            throw e
        })
        documentCache.set(name, request)
    }
    return documentCache.get(name)
}

export const fetchExpressable = async (documentName, name, contextref) => {
    const query = new URLSearchParams({
        documentName: documentName || '',
        name: name || '',
        contextref: contextref || '',
    })
    const response = await fetch(`${base()}/facts?${query}`)
    if (!response.ok) {
        throw new Error(`Request failed (${response.status}): facts`)
    }
    try {
        return await response.json()
    } catch {
        return null // the server answers with an empty body for unknown facts
    }
}

// The raw inline XBRL source of one of catalog.Documents (sent as-is, not
// JSON, despite the server's Content-Type header).
export const fetchExpressableDocument = async (documentName) => {
    const query = new URLSearchParams({ documentname: documentName || '' })
    const text = await get(`${base()}/documents?${query}`, 'text')
    if (!text.trim()) {
        throw new Error(`The server returned no content for ${documentName}`)
    }
    return text
}