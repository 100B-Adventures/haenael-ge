export function validateGoalDraft(input: { title: string; dueDate: string }) {
  if (input.title.trim().length < 2) return "목표는 2자 이상 적어 주세요.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return "마감일은 YYYY-MM-DD로 적어 주세요.";
  const date = new Date(`${input.dueDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "마감일을 확인해 주세요.";
  return null;
}
