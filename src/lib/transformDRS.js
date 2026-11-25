import { pickLabel } from './labels'

export default (drs, labelRole, lang) => ({
    nodes: drs.Nodes.map(data => ({
        name: pickLabel(data.Label, labelRole, lang),
        id: data.Href,
    })),
    links: drs.Links.map(link => ({
        source: link.SourceHref,
        target: link.TargetHref,
    })),
})
