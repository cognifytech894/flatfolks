/**
 * Admin sessions end 30 minutes after login. When an admin action comes back
 * unauthorised, go to the login page instead of showing a vague error.
 * Returns true when it has redirected.
 */
export function sessionEnded(response: Response): boolean {
  if (response.status !== 401 && response.status !== 403) return false;
  window.location.assign("/admin/login");
  return true;
}
