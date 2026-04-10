export const SHELL_PROFILE_REFRESH_EVENT = "fast:shell-profile-refresh";

export function dispatchShellProfileRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(SHELL_PROFILE_REFRESH_EVENT));
}
