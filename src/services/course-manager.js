import { extractTermFromOffering, parseTermCode } from './term-parser.js';

/**
 * Regex to parse standard Waterloo Quest course offering codes:
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
 * Determines the academic component of a course (LEC, LAB, TUT, TST, SEM, PRJ, etc.).
 * Accurately recognizes Waterloo conventions such as course numbers ending in 'L' (e.g. CHEM 220L).
 * @param {object} params
 * @param {string} [params.rawCode]
 * @param {string} [params.name]
 * @param {string} [params.catalogNumber]
 * @param {string} [params.explicitComponent]
 * @returns {string} Component code (e.g. 'LEC', 'LAB', 'TUT', 'TST', 'SEM', 'PRJ')
 */
export function determineCourseComponent({
  rawCode = '',
  name = '',
  catalogNumber = '',
  explicitComponent = '',
} = {}) {
  // 1. If explicit component is passed (e.g. from Quest format like .LEC, .LAB, .TUT)
  if (explicitComponent) {
    const exp = explicitComponent.toUpperCase().trim();
    if (['LEC', 'LAB', 'TUT', 'TST', 'SEM', 'PRJ', 'CLN', 'PRA'].includes(exp)) {
      return exp;
    }
  }

  const combined = `${rawCode} ${name}`.toUpperCase();

  // 2. Explicit keywords in course code or name (with boundary or delimiter checks)
  if (/(?:^|[\s._-])(LAB|LABORATORY)(?:$|[\s._-])/i.test(combined)) {
    return 'LAB';
  }
  if (/(?:^|[\s._-])(TUT|TUTORIAL|REC|RECITATION)(?:$|[\s._-])/i.test(combined)) {
    return 'TUT';
  }
  if (/(?:^|[\s._-])(TST|TEST\s*SLOT|MIDTERM\s*SLOT|EXAM)(?:$|[\s._-])/i.test(combined)) {
    return 'TST';
  }
  if (/(?:^|[\s._-])(SEM|SEMINAR)(?:$|[\s._-])/i.test(combined)) {
    return 'SEM';
  }
  if (/(?:^|[\s._-])(PRJ|PROJECT|THESIS)(?:$|[\s._-])/i.test(combined)) {
    return 'PRJ';
  }
  if (/(?:^|[\s._-])(CLN|CLINIC|CLINICAL)(?:$|[\s._-])/i.test(combined)) {
    return 'CLN';
  }
  if (/(?:^|[\s._-])(PRA|PRACTICUM)(?:$|[\s._-])/i.test(combined)) {
    return 'PRA';
  }

  // 3. Catalog number suffix conventions at University of Waterloo:
  // Any course number ending in 'L' (e.g. '220L', '240L', '121L', '135L', '360L') is a Laboratory (LAB)
  const cat = String(catalogNumber || '').toUpperCase().trim();
  if (cat.endsWith('L')) {
    return 'LAB';
  }
  if (cat.endsWith('T') || cat.endsWith('R')) {
    return 'TUT';
  }

  // 4. Default fallback to Lecture (LEC)
  return 'LEC';
}

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
  let section = '';
  let explicitComponent = '';

  const questMatch = rawCode.match(COURSE_PATTERN);
  if (questMatch) {
    subject = questMatch[2].toUpperCase();
    catalogNumber = questMatch[3].toUpperCase();
    section = questMatch[4];
    explicitComponent = questMatch[6].toUpperCase();
  } else {
    // 1. Try parsing Waterloo LEARN instructor code format:
    // e.g. "CHEM220L_sblavery_1269" or "BIOL439_oigboeli_1269" or "CS135_1269"
    const learnCodeMatch = rawCode.match(/^([A-Z]{2,10})([0-9]{2,4}[A-Z]*)(?:_([a-z0-9]+))?(?:_(\d{4}))?$/i);
    if (learnCodeMatch) {
      subject = learnCodeMatch[1].toUpperCase();
      catalogNumber = learnCodeMatch[2].toUpperCase();
      section = learnCodeMatch[3] || '';
    } else {
      // 2. Try parsing Course Name format:
      // e.g. "CHEM 220L - Fall 2026" or "BIOL 439 - Fall 2026"
      const nameMatch = String(orgUnit.Name || '').match(/^([A-Z]{2,10})\s+([0-9]{2,4}[A-Z]*)/i);
      if (nameMatch) {
        subject = nameMatch[1].toUpperCase();
        catalogNumber = nameMatch[2].toUpperCase();
      } else {
        // 3. Fallback regex anywhere in Name or Code
        const anyMatch = (String(orgUnit.Name || '') + ' ' + rawCode).match(/\b([A-Z]{2,10})\s*([0-9]{2,4}[A-Z]*)\b/i);
        if (anyMatch) {
          subject = anyMatch[1].toUpperCase();
          catalogNumber = anyMatch[2].toUpperCase();
        } else {
          subject = rawCode.replace(/^[0-9]+-/, '').split(/[\s._-]/)[0].toUpperCase();
        }
      }
    }
  }

  const component = determineCourseComponent({
    rawCode,
    name: orgUnit.Name,
    catalogNumber,
    explicitComponent,
  });

  const displayName = subject && catalogNumber
    ? `${subject} ${catalogNumber} (${component})`
    : orgUnit.Name;

  // By default, lectures and labs are enabled, while tutorials and test slots can be enabled manually
  const defaultEnabled = component === 'LEC' || component === 'LAB' || component === 'SEM' || component === 'PRJ';

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
