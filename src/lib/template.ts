export function downloadGuestTemplate() {
  const csv = "Name,Party,RSVP,Meal,Side,Is Kid,Accessibility,Notes,Must sit with,Must not sit with\nJane Doe,Doe Family,attending,Chicken,Bride,no,,Allergic to nuts,John Doe,\nJohn Doe,Doe Family,attending,Fish,Bride,no,,,Jane Doe,\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "guest-template.csv"; a.click();
  URL.revokeObjectURL(url);
}