// Clear the server's session cookie too, not just this browser's saved
// profile; otherwise the server still treats the visitor as signed in
// (and shows contact numbers) after "Log out".
export async function logout() {
  await fetch("/api/auth/otp", { method: "DELETE" }).catch(() => {});
  localStorage.removeItem("flatfolks_user");
  localStorage.removeItem("flatfolks_profile_photo");
  window.location.assign("/auth");
}
