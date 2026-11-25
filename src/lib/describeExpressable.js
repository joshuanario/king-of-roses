import { formatFact, narrativeHtml, pickLabel } from './labels'

// Plain description of one fact for the inline XBRL inspector.
export default (expressable, role, lang) => {
    const context = expressable.Context || {}
    const periodLang = lang === 'Truncated' ? 'Unlabelled' : lang
    const memberGrid = context.ContextualMemberGrid || []
    const members = (context.VoidQuadrant || []).map((voidCell, i) => {
        const memberCell = memberGrid[i]?.[0] ?? {}
        return {
            dimension: pickLabel((voidCell.TypedDomain || voidCell.Dimension)?.Label, role, lang),
            member: memberCell.TypedMember
                ?? (memberCell.ExplicitMember ? pickLabel(memberCell.ExplicitMember.Label, role, lang) : ''),
            typed: memberCell.TypedMember !== undefined,
        }
    })
    const expression = expressable.Expression
    const narrative = expression?.Unlabelled?.Core ? null : narrativeHtml(expression, lang)
    return {
        concept: pickLabel(expressable.Labels, role, lang),
        period: context.Period?.[periodLang] || context.Period?.Unlabelled || '',
        members,
        value: narrative ? null : formatFact(expression, lang),
        narrative,
        footnotes: expressable.Footnotes || [],
    }
}
