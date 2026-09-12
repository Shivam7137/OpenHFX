import type { Category, ReportSuggestion } from '../../contracts';
import type { PreparedContext } from './validation';

const rules: [Category, RegExp][] = [
  ['trees', /\b(tree|trees|branch|branches|limb|limbs|stump)\b/i],
  ['lighting', /\b(streetlight|streetlights|lighting|lamp|lamps|light|lights)\b/i],
  ['waste', /\b(garbage|rubbish|waste|litter|dumping|trash|bin|bins)\b/i],
  ['roads', /\b(pothole|potholes|road|roads|asphalt|pavement)\b/i],
  ['access', /\b(access|accessible|accessibility|wheelchair|ramp|sidewalk|walkway|path|blocked)\b/i],
];
const titles: Record<Category, string> = {
  trees: 'Tree concern reported', lighting: 'Lighting concern reported', waste: 'Waste concern reported',
  roads: 'Road concern reported', access: 'Access concern reported', other: 'Local concern reported',
};

/** A small explicit rule-based demonstration. This does not use a language model. */
export function demoSuggestion(context: PreparedContext): ReportSuggestion {
  const { input, organizations, candidates } = context;
  const category = input.category ?? rules.find(([, pattern]) => pattern.test(input.originalDescription))?.[0] ?? 'other';
  const suggestedOrganizationIds = organizations.filter(org => org.categoryIds.includes(category)).slice(0, 3).map(org => org.id);
  return {
    title: titles[category],
    summary: input.originalDescription.slice(0, 500),
    category,
    suggestedOrganizationIds,
    possibleRelatedIssueIds: candidates.filter(issue => issue.category === category).slice(0, 3).map(issue => issue.id),
    clarificationQuestions: [],
    suggestedNextSteps: [
      'Review this demonstration suggestion and confirm the report details.',
      suggestedOrganizationIds.length ? 'Confirm the suggested organization before submitting your report.'
        : 'Submit for manual review; no matching organization is available in this directory.',
    ],
    prioritySuggestion: 'standard',
    priorityReason: 'Demonstration default only. An authorized coordinator must review priority; risk has not been assessed.',
  };
}
