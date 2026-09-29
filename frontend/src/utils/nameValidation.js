// Names in any script (English, Hindi, Marathi…), not just A–Z.

// People: letters, spaces and . ' -   e.g. "R. K. Sharma", "रमेश पाटील"
export const PERSON_NAME_PATTERN = /^[\p{L}\p{M}\s.'-]+$/u
export const stripNonPersonName = (v) => v.replace(/[^\p{L}\p{M}\s.'-]/gu, '')

// Businesses/parties also use digits and & , / ( )   e.g. "Sharma & Sons", "A-1 Transport", "M/s Patil (Pune)"
export const BUSINESS_NAME_PATTERN = /^[\p{L}\p{M}\p{N}\s&.,'()/-]+$/u
