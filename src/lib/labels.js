// Shared lookups for the label / language / fact-value shapes the server sends.

export const pickLabel = (label, role, lang) =>
    label?.[role]?.[lang] || label?.Default?.[lang] || label?.Default?.Unlabelled || ''

export const periodText = (period, lang) => period?.[lang] || period?.Unlabelled || ''

export const narrativeHtml = (fact, lang) =>
    fact?.[lang]?.InnerHtml || fact?.Unlabelled?.InnerHtml || null

export const formatFact = (fact, lang) => {
    if (!fact?.Unlabelled) return ''
    if (fact.Unlabelled.Core) {
        const f = fact[lang] || fact.Unlabelled
        return f.Head + f.Core + f.Tail
    }
    return fact.Unlabelled.InnerHtml ? '...' : ''
}

// [labelRole, lang] pairs for the label selector.
export const pairsFromRenderable = (renderable) =>
    (renderable?.LabelRoles || []).flatMap((role) =>
        (renderable.Lang || []).map((lang) => [role, lang]))

export const pairsFromLabels = (labels) =>
    Object.entries(labels || {}).flatMap(([role, langs]) =>
        Object.keys(langs || {}).map((lang) => [role, lang]))
