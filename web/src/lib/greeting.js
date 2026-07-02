// Time-of-day greeting for the Librarian home page. Boundaries per spec:
// <12 morning, <18 afternoon, else evening.
export function timeGreeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
