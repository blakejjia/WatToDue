/**
 * D2L Brightspace Valence REST API Endpoint Builders for Waterloo LEARN.
 */

export const BASE_URL = 'https://learn.uwaterloo.ca';

export const Endpoints = {
  versions: () => `${BASE_URL}/d2l/api/versions/`,

  whoAmI: (lpVersion) => `${BASE_URL}/d2l/api/lp/${lpVersion}/users/whoami`,

  enrollments: (lpVersion, bookmark = null) => {
    let url = `${BASE_URL}/d2l/api/lp/${lpVersion}/enrollments/myenrollments/`;
    if (bookmark) {
      url += `?bookmark=${encodeURIComponent(bookmark)}`;
    }
    return url;
  },

  dropboxes: (leVersion, orgUnitId) =>
    `${BASE_URL}/d2l/api/le/${leVersion}/${orgUnitId}/dropbox/folders/`,

  quizzes: (leVersion, orgUnitId) =>
    `${BASE_URL}/d2l/api/le/${leVersion}/${orgUnitId}/quizzes/`,

  grades: (leVersion, orgUnitId) =>
    `${BASE_URL}/d2l/api/le/${leVersion}/${orgUnitId}/grades/values/myGradeValues/`,

  // Direct student deep-links in LEARN UI:
  dropboxSubmissionUrl: (orgUnitId, folderId) =>
    `${BASE_URL}/d2l/lms/dropbox/user/folder_submit_files.d2l?db=${folderId}&ou=${orgUnitId}`,

  quizSummaryUrl: (orgUnitId, quizId) =>
    `${BASE_URL}/d2l/lms/quizzing/user/quiz_summary.d2l?qi=${quizId}&ou=${orgUnitId}`,

  courseHomeUrl: (orgUnitId) =>
    `${BASE_URL}/d2l/home/${orgUnitId}`,
};
