import { extractTermFromOffering, parseTermCode } from './term-parser.js';

/**
 * Regex to parse standard Waterloo course offering names:
 * e.g. "1265-CHEM.233.001.1.LEC" or "1265-BIOL.240L.003.1.LAB"
 * Matches:
 * Group 1: Term (1265)
 * Group 2: Subject (CHEM)
 * Group 3: CatalogNumber (233 or 240L)
 * Group 4: Section (001)
 * Group 5: Campus / Class (1)
 * Group 6: Component (LEC, LAB, TUT, TST)
 */
const COURSE_PATTERN = /^(\d{4})-([A-Z]+)\.([0-9A-Z]+)\.(\d+)\.(\d+)\.([A-Z]+)$/i;

/**
 * Parses raw enrollment item from D2L API `/d2l/api/lp/{lp}/enrollments/myenrollments/`.
 * @param {object} rawItem
 * @returns {object | null} Normalized CourseOffering or null if not an academic course offering
 */
export function parseCourseOffering(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  const orgUnit = rawItem.OrgUnit;
  if (!orgUnit || typeof orgUnit !== 'object' || typeof orgUnit.Id !== 'number') {
    return null;
  }

  // Check type code: must be 'Course Offering'
  const typeCode = orgUnit.Type?.Code;
  if (typeof typeCode === 'string' && typeCode.toLowerCase() !== 'course offering') {
    return null;
  }

  const rawCode = String(orgUnit.Code || orgUnit.Name || '').trim();
  const termCode = extractTermFromOffering(rawCode);
  if (!termCode) {
    return null;
  }

  const termInfo = parseTermCode(termCode);
  const termLabel = termInfo ? termInfo.label : `Term ${termCode}`;

  let subject = '';
  let catalogNumber = '';
  let component = 'LEC';
  let section = '';

  const match = rawCode.match(COURSE_PATTERN);
  if (match) {
    subject = match[2].toUpperCase();
    catalogNumber = match[3].toUpperCase();
    section = match[4];
    component = match[6].toUpperCase();
  } else {
    // Fallback: simple heuristic
    subject = rawCode.replace(/^[0-9]+-/, '').split(/[\s.-]/)[0].toUpperCase();
  }

  const displayName = subject && catalogNumber
    ? `${subject} ${catalogNumber} (${component})`
    : orgUnit.Name;

  // By default, lectures and labs are enabled, while tutorials and test slots can be enabled manually
  const defaultEnabled = component === 'LEC' || component === 'LAB';

  const isActive = rawItem.Access?.IsActive ?? true;

  return {
    id: orgUnit.Id,
    code: orgUnit.Code || rawCode,
    name: orgUnit.Name,
    displayName,
    termCode,
    termLabel,
    subject,
    catalogNumber,
    component,
    section,
    isActive,
    defaultEnabled,
  };
}

/**
 * Groups an array of parsed courses by term code, sorted newest term first.
 * @param {Array<object>} courses
 * @returns {Array<{ termCode: string, termLabel: string, courses: Array<object> }>}
 */
export function groupCoursesByTerm(courses) {
  if (!Array.isArray(courses)) {
    return [];
  }

  const map = new Map();
  for (const course of courses) {
    if (!course || !course.termCode) continue;
    if (!map.has(course.termCode)) {
      map.set(course.termCode, {
        termCode: course.termCode,
        termLabel: course.termLabel || `Term ${course.termCode}`,
        courses: [],
      });
    }
    map.get(course.termCode).courses.push(course);
  }

  // Sort terms descending (e.g. 1265 > 1261 > 1259)
  return Array.from(map.values()).sort((a, b) => b.termCode.localeCompare(a.termCode));
}
